/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ORBITAL X — Full-Screen Cinematic 3D Cosmos Engine
 * Continuous, full-viewport living space environment with procedural planets,
 * luminous star with animated corona, transiting exoplanet, asteroid belt,
 * communication laser links, directional photon packets, and smooth camera parallax.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NetworkNode, NetworkLink, RouteResult, AsteroidCluster, ExoplanetTransitData } from '../types/network';

interface CinematicSpaceCanvasProps {
  cameraMode: 'overview' | 'network' | 'exoplanet';
  isDisruptionActive?: boolean;
  nodes: NetworkNode[];
  links: NetworkLink[];
  activeRoute: RouteResult | null;
  asteroidClusters: AsteroidCluster[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  targetSystem: ExoplanetTransitData;
  orbitalPhase: number;
  onOrbitalPhaseChange?: (phase: number) => void;
  packetProgress: number;
  isStreaming: boolean;
  isInTransit: boolean;
  onResetView?: () => void;
}

// Reusable math objects for zero-garbage-collection render loop
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3Target = new THREE.Vector3();
const _camTarget = new THREE.Vector3();

export const CinematicSpaceCanvas: React.FC<CinematicSpaceCanvasProps> = ({
  cameraMode,
  isDisruptionActive = false,
  nodes,
  links,
  activeRoute,
  asteroidClusters,
  selectedNodeId,
  onSelectNode,
  targetSystem,
  orbitalPhase,
  packetProgress,
  isStreaming,
  isInTransit,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const currentCameraModeRef = useRef(cameraMode);

  // References to dynamic 3D elements for live updates without WebGL re-init
  const starCoronaRef = useRef<THREE.Mesh | null>(null);
  const transitingPlanetRef = useRef<THREE.Group | null>(null);
  const nodeGroupsRef = useRef<Map<string, THREE.Group>>(new Map());
  const linkLinesRef = useRef<Map<string, { line: THREE.Line; glow: THREE.Line }>>(new Map());
  const asteroidGroupsRef = useRef<Map<string, THREE.Group>>(new Map());
  const packetsGroupRef = useRef<THREE.Group | null>(null);
  const cometMeshRef = useRef<THREE.Group | null>(null);

  // Mouse parallax state
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // Direct DOM ref map for HUD reticles (avoids React render-thrashing at 60fps)
  const reticleElementsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [webGlSupported, setWebGlSupported] = useState<boolean>(true);

  useEffect(() => {
    currentCameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- 1. Scene, Camera, & High-Performance Renderer ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.009);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1500);
    camera.position.set(-2, 14, 52);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      renderer.setClearColor(0x020617);
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.warn('WebGL initialization failed, falling back gracefully:', err);
      setWebGlSupported(false);
      return;
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 180;
    controls.minDistance = 8;
    controls.maxPolarAngle = Math.PI / 2 + 0.2;
    controls.target.set(6, 0, 0);
    controlsRef.current = controls;

    // --- 2. Lighting Setup (Host Star Point Light + Cool Fill) ---
    const ambientLight = new THREE.AmbientLight(0x0a1128, 1.2);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x020617, 0.7);
    scene.add(hemiLight);

    // Star point light at [34, 0, -2] casting luminous golden glow across deep space
    const hostStarLight = new THREE.PointLight(0xf59e0b, 5.0, 140, 1.2);
    hostStarLight.position.set(34, 0, -2);
    scene.add(hostStarLight);

    const secondaryWarmLight = new THREE.DirectionalLight(0xffedd5, 1.6);
    secondaryWarmLight.position.set(40, 20, 10);
    scene.add(secondaryWarmLight);

    // --- 3. Multi-Layer Deep Space Starfield & Volumetric Nebulae ---
    // Layer A: Distant micro stars (3,000 count)
    const microStarCount = 3200;
    const microGeo = new THREE.BufferGeometry();
    const microPos = new Float32Array(microStarCount * 3);
    const microCols = new Float32Array(microStarCount * 3);

    for (let i = 0; i < microStarCount; i++) {
      const idx = i * 3;
      const r = 200 + Math.random() * 250;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      microPos[idx] = r * Math.sin(phi) * Math.cos(theta);
      microPos[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      microPos[idx + 2] = r * Math.cos(phi);

      const tint = Math.random();
      if (tint > 0.82) {
        // Cyan / Blue giant
        microCols[idx] = 0.45; microCols[idx + 1] = 0.8; microCols[idx + 2] = 1.0;
      } else if (tint > 0.65) {
        // Golden / Amber dwarf
        microCols[idx] = 1.0; microCols[idx + 1] = 0.85; microCols[idx + 2] = 0.5;
      } else if (tint > 0.5) {
        // Subtle violet
        microCols[idx] = 0.75; microCols[idx + 1] = 0.6; microCols[idx + 2] = 1.0;
      } else {
        // White
        microCols[idx] = 0.95; microCols[idx + 1] = 0.98; microCols[idx + 2] = 1.0;
      }
    }
    microGeo.setAttribute('position', new THREE.BufferAttribute(microPos, 3));
    microGeo.setAttribute('color', new THREE.BufferAttribute(microCols, 3));

    const microMat = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
    });
    scene.add(new THREE.Points(microGeo, microMat));

    // Layer B: Volumetric Cosmic Nebulae (Multi-layer soft particles with Additive Blending)
    function createNebulaTexture(colorHex: string): THREE.CanvasTexture {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
      grad.addColorStop(0, colorHex);
      grad.addColorStop(0.4, 'rgba(15, 23, 42, 0.4)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }

    const nebulaMatCyan = new THREE.PointsMaterial({
      size: 120,
      map: createNebulaTexture('rgba(6, 182, 212, 0.22)'),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const nebulaMatViolet = new THREE.PointsMaterial({
      size: 150,
      map: createNebulaTexture('rgba(168, 85, 247, 0.18)'),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const nebulaMatGold = new THREE.PointsMaterial({
      size: 110,
      map: createNebulaTexture('rgba(245, 158, 11, 0.2)'),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const nebulaGeo = new THREE.BufferGeometry();
    const nebPositions = new Float32Array([
      -50, 20, -120,
      30, -30, -140,
      80, 40, -130,
      -80, -20, -110,
    ]);
    nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nebPositions, 3));
    scene.add(new THREE.Points(nebulaGeo, nebulaMatCyan));
    scene.add(new THREE.Points(nebulaGeo, nebulaMatViolet));
    scene.add(new THREE.Points(nebulaGeo, nebulaMatGold));

    // Dynamic Packet Group
    const packetsGroup = new THREE.Group();
    scene.add(packetsGroup);
    packetsGroupRef.current = packetsGroup;

    // --- 4. Procedural Textures for Celestial Bodies ---
    function createEarthTexture(): THREE.CanvasTexture {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      // Deep Ocean Blue
      ctx.fillStyle = '#0a235c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Continents (Procedural Landmasses)
      ctx.fillStyle = '#1b5e37';
      for (let i = 0; i < 24; i++) {
        const x = (Math.sin(i * 1.7) * 0.45 + 0.5) * canvas.width;
        const y = (Math.cos(i * 1.3) * 0.35 + 0.5) * canvas.height;
        const r = 22 + Math.random() * 40;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Swirling Atmospheric Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      for (let i = 0; i < 18; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.beginPath();
        ctx.ellipse(x, y, 45 + Math.random() * 55, 10 + Math.random() * 14, Math.random() * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }

    function createStarTexture(): THREE.CanvasTexture {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      // Luminous Golden Core
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, 0, 512, 256);

      // Solar granules / convection cells
      for (let i = 0; i < 600; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 256;
        const r = 3 + Math.random() * 12;
        ctx.fillStyle = Math.random() > 0.4 ? '#fbbf24' : '#ea580c';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }

    function createRockTexture(): THREE.CanvasTexture {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, 256, 256);

      for (let i = 0; i < 400; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        ctx.fillStyle = Math.random() > 0.5 ? '#1e293b' : '#475569';
        ctx.beginPath();
        ctx.arc(x, y, 1 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }

    const earthTexture = createEarthTexture();
    const starTexture = createStarTexture();
    const rockTexture = createRockTexture();

    // --- 5. Build Procedural Node Models (3-12 Parts Each) ---
    const nodeGroups = new Map<string, THREE.Group>();

    nodes.forEach(node => {
      const group = new THREE.Group();
      group.position.set(node.position[0], node.position[1], node.position[2]);
      group.name = node.id;

      if (node.type === 'earth') {
        // Detailed Procedural Earth: Core + Atmosphere Glow + Orbital Station Ring
        const earthSphere = new THREE.Mesh(
          new THREE.SphereGeometry(2.6, 32, 32),
          new THREE.MeshStandardMaterial({
            map: earthTexture,
            roughness: 0.55,
            metalness: 0.1,
          })
        );
        group.add(earthSphere);

        // Atmosphere Glow Shell
        const atmosphere = new THREE.Mesh(
          new THREE.SphereGeometry(2.9, 32, 32),
          new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.28,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
          })
        );
        group.add(atmosphere);

        // Ground DSN Antenna Array
        const dsnDish = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.08, 0.45, 16),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 })
        );
        dsnDish.position.set(2.0, 1.4, 0.9);
        dsnDish.lookAt(20, 0, 0);
        group.add(dsnDish);

        // Geosynchronous Orbit Ring
        const ringGeo = new THREE.RingGeometry(3.6, 3.7, 48);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide, transparent: true, opacity: 0.35 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

      } else if (node.type === 'relay') {
        // Autonomous Deep Space Relay Station (Multi-Part Procedural Satellite)
        // 1. Central bus
        const core = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.55, 1.5, 8),
          new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.2 })
        );
        group.add(core);

        // 2 & 3. Dual High-Efficiency Solar Panel Wings
        const solarWingGeo = new THREE.BoxGeometry(2.4, 0.08, 0.85);
        const solarMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.9, roughness: 0.15 });

        const wingLeft = new THREE.Mesh(solarWingGeo, solarMat);
        wingLeft.position.set(-1.8, 0, 0);
        group.add(wingLeft);

        const wingRight = new THREE.Mesh(solarWingGeo, solarMat);
        wingRight.position.set(1.8, 0, 0);
        group.add(wingRight);

        // 4. Parabolic High-Gain Dish Antenna
        const dish = new THREE.Mesh(
          new THREE.SphereGeometry(0.75, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2.2),
          new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.75, roughness: 0.25, side: THREE.DoubleSide })
        );
        dish.position.set(0, 0.9, 0);
        dish.rotation.x = -Math.PI / 2.4;
        group.add(dish);

        // 5. Phased Array Feed Horn
        const feed = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 0.65),
          new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.9, roughness: 0.1 })
        );
        feed.position.set(0, 1.25, 0.45);
        group.add(feed);

        // 6. Blinking Beacon LED Ring
        const ledRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.8, 0.04, 8, 24),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        );
        ledRing.rotation.x = Math.PI / 2;
        group.add(ledRing);

      } else if (node.type === 'spacecraft') {
        // Deep-Space Flagship "Orbital-X Surveyor"
        // 1. Main cylindrical instrument hull
        const hull = new THREE.Mesh(
          new THREE.CylinderGeometry(0.7, 0.85, 2.4, 12),
          new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.25 })
        );
        hull.rotation.z = Math.PI / 2;
        group.add(hull);

        // 2. High-aperture exoplanet photometer telescope barrel
        const lensCone = new THREE.Mesh(
          new THREE.CylinderGeometry(0.9, 0.7, 1.2, 16),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 })
        );
        lensCone.rotation.z = Math.PI / 2;
        lensCone.position.set(1.5, 0, 0);
        group.add(lensCone);

        // Telescope sapphire collector optic
        const lensGlass = new THREE.Mesh(
          new THREE.CircleGeometry(0.84, 24),
          new THREE.MeshPhysicalMaterial({
            color: 0x38bdf8,
            transmission: 0.95,
            roughness: 0.05,
            ior: 1.55,
          })
        );
        lensGlass.position.set(2.11, 0, 0);
        lensGlass.rotation.y = Math.PI / 2;
        group.add(lensGlass);

        // 3. Golden thermal multilayer insulation box
        const goldBox = new THREE.Mesh(
          new THREE.BoxGeometry(1.0, 1.0, 1.0),
          new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.95, roughness: 0.3 })
        );
        goldBox.position.set(-0.6, 0.9, 0);
        group.add(goldBox);

        // 4. High-gain parabolic antenna pointing back to inner system
        const dish = new THREE.Mesh(
          new THREE.SphereGeometry(0.85, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2.2),
          new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.7, roughness: 0.2, side: THREE.DoubleSide })
        );
        dish.position.set(-1.5, 0, 0);
        dish.rotation.y = -Math.PI / 2;
        group.add(dish);

        // 5. Radiator panels
        const radWing = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 2.6, 1.1),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.6 })
        );
        radWing.position.set(0, 0, 1.3);
        group.add(radWing);

      } else if (node.type === 'target_system') {
        // Enormous Glowing Host Star with Animated Corona & Transiting Exoplanet
        // 1. Host Star Core
        const star = new THREE.Mesh(
          new THREE.SphereGeometry(3.6, 36, 36),
          new THREE.MeshBasicMaterial({
            map: starTexture,
            color: 0xffedd5,
          })
        );
        group.add(star);

        // 2. Multi-layer Animated Corona Flare
        const corona = new THREE.Mesh(
          new THREE.SphereGeometry(4.7, 32, 32),
          new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            transparent: true,
            opacity: 0.38,
            blending: THREE.AdditiveBlending,
          })
        );
        group.add(corona);
        starCoronaRef.current = corona;

        // 3. Outer Stellar Wind Atmosphere
        const outerHalo = new THREE.Mesh(
          new THREE.SphereGeometry(6.2, 28, 28),
          new THREE.MeshBasicMaterial({
            color: 0xef4444,
            transparent: true,
            opacity: 0.16,
            blending: THREE.AdditiveBlending,
          })
        );
        group.add(outerHalo);

        // 4. Keplerian Exoplanet Orbit & Transiting Planet Model
        const planetOrbitGroup = new THREE.Group();
        planetOrbitGroup.name = 'transitingPlanetOrbit';

        // Planet Body
        const exoplanet = new THREE.Mesh(
          new THREE.SphereGeometry(0.85, 24, 24),
          new THREE.MeshStandardMaterial({
            color: 0x090d16,
            roughness: 0.85,
            metalness: 0.1,
          })
        );

        // Thin Atmospheric Edge Rim
        const exoplanetAtm = new THREE.Mesh(
          new THREE.SphereGeometry(0.92, 24, 24),
          new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending,
          })
        );
        exoplanet.add(exoplanetAtm);

        // Initial offset along orbit radius 8.0
        exoplanet.position.set(8.0, 0, 0);
        planetOrbitGroup.add(exoplanet);
        group.add(planetOrbitGroup);
        transitingPlanetRef.current = planetOrbitGroup;

        // Orbit Ellipse Track (slight inclination 88.5 deg so transit crosses star face)
        const orbitTrack = new THREE.Mesh(
          new THREE.RingGeometry(7.94, 8.06, 64),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
        );
        orbitTrack.rotation.x = Math.PI / 2.05;
        group.add(orbitTrack);
      }

      scene.add(group);
      nodeGroups.set(node.id, group);
    });

    nodeGroupsRef.current = nodeGroups;

    // --- 6. Procedural Asteroid Clusters & Hyperbolic Comet ---
    const asteroidGroups = new Map<string, THREE.Group>();

    asteroidClusters.forEach(cluster => {
      const clusterGroup = new THREE.Group();
      clusterGroup.position.set(cluster.position[0], cluster.position[1], cluster.position[2]);
      clusterGroup.name = cluster.id;

      // Group of craggy irregular rocky boulders
      const boulderCount = 26;
      for (let i = 0; i < boulderCount; i++) {
        const radius = 0.35 + Math.random() * 0.85;
        const boulderGeo = new THREE.DodecahedronGeometry(radius, 1);

        // Displace vertices for craggy procedural rock look
        const posAttr = boulderGeo.attributes.position;
        for (let v = 0; v < posAttr.count; v++) {
          const vx = posAttr.getX(v) * (1 + (Math.random() - 0.5) * 0.4);
          const vy = posAttr.getY(v) * (1 + (Math.random() - 0.5) * 0.4);
          const vz = posAttr.getZ(v) * (1 + (Math.random() - 0.5) * 0.4);
          posAttr.setXYZ(v, vx, vy, vz);
        }
        boulderGeo.computeVertexNormals();

        const boulderMat = new THREE.MeshStandardMaterial({
          map: rockTexture,
          roughness: 0.9,
          metalness: 0.1,
          color: cluster.type === 'comet_coma' ? 0x93c5fd : 0x78716c,
        });

        const boulder = new THREE.Mesh(boulderGeo, boulderMat);
        const dist = Math.random() * cluster.radius;
        const ang = Math.random() * Math.PI * 2;
        const elev = (Math.random() - 0.5) * cluster.radius * 0.85;
        boulder.position.set(Math.cos(ang) * dist, elev, Math.sin(ang) * dist);
        boulder.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        boulder.userData = {
          rotSpeed: [(Math.random() - 0.5) * 0.025, (Math.random() - 0.5) * 0.025, (Math.random() - 0.5) * 0.025],
        };
        clusterGroup.add(boulder);
      }

      // Debris & Dust Particles
      const dustCount = 90;
      const dustGeo = new THREE.BufferGeometry();
      const dustPos = new Float32Array(dustCount * 3);
      for (let d = 0; d < dustCount; d++) {
        const dIdx = d * 3;
        dustPos[dIdx] = (Math.random() - 0.5) * cluster.radius * 2.3;
        dustPos[dIdx + 1] = (Math.random() - 0.5) * cluster.radius * 1.6;
        dustPos[dIdx + 2] = (Math.random() - 0.5) * cluster.radius * 2.3;
      }
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
      const dustMat = new THREE.PointsMaterial({
        size: 0.8,
        color: cluster.type === 'comet_coma' ? 0x38bdf8 : 0xf97316,
        transparent: true,
        opacity: 0.65,
      });
      clusterGroup.add(new THREE.Points(dustGeo, dustMat));

      // Danger Perimeter Wireframe (Illuminated when occluding RF lines)
      const perimeterGeo = new THREE.SphereGeometry(cluster.radius, 16, 12);
      const perimeterMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        wireframe: true,
        transparent: true,
        opacity: cluster.active ? 0.45 : 0.0,
      });
      const perimeterMesh = new THREE.Mesh(perimeterGeo, perimeterMat);
      perimeterMesh.name = 'dangerPerimeter';
      clusterGroup.add(perimeterMesh);

      clusterGroup.visible = cluster.active;
      scene.add(clusterGroup);
      asteroidGroups.set(cluster.id, clusterGroup);
    });

    asteroidGroupsRef.current = asteroidGroups;

    // Hyperbolic Comet with Particle Ion Tail
    const cometGroup = new THREE.Group();
    cometGroup.position.set(-6, -12, 14);
    const cometHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xbae6fd })
    );
    cometGroup.add(cometHead);

    const tailCount = 140;
    const tailGeo = new THREE.BufferGeometry();
    const tailPos = new Float32Array(tailCount * 3);
    for (let t = 0; t < tailCount; t++) {
      const idx = t * 3;
      const progress = t / tailCount;
      tailPos[idx] = -progress * 18 + (Math.random() - 0.5) * progress * 4;
      tailPos[idx + 1] = -progress * 6 + (Math.random() - 0.5) * progress * 3;
      tailPos[idx + 2] = -progress * 14 + (Math.random() - 0.5) * progress * 4;
    }
    tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPos, 3));
    const tailMat = new THREE.PointsMaterial({
      size: 1.2,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    cometGroup.add(new THREE.Points(tailGeo, tailMat));
    scene.add(cometGroup);
    cometMeshRef.current = cometGroup;

    // --- 7. Build Dynamic Communication Link Lines ---
    const linkLines = new Map<string, { line: THREE.Line; glow: THREE.Line }>();

    links.forEach(link => {
      const srcNode = nodes.find(n => n.id === link.source);
      const tgtNode = nodes.find(n => n.id === link.target);
      if (!srcNode || !tgtNode) return;

      const points = [
        new THREE.Vector3(...srcNode.position),
        new THREE.Vector3(...tgtNode.position),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      // Core Line
      const material = new THREE.LineBasicMaterial({
        color: 0x475569,
        linewidth: 1,
        transparent: true,
        opacity: 0.45,
      });
      const line = new THREE.Line(geometry, material);

      // Glow halo line
      const glowMaterial = new THREE.LineBasicMaterial({
        color: 0x1e293b,
        linewidth: 2,
        transparent: true,
        opacity: 0.2,
      });
      const glow = new THREE.Line(geometry, glowMaterial);

      scene.add(glow);
      scene.add(line);
      linkLines.set(link.id, { line, glow });
    });

    linkLinesRef.current = linkLines;

    // --- 8. Mouse Parallax and Raycasting Listeners ---
    const onPointerMove = (e: MouseEvent) => {
      const xNorm = (e.clientX / window.innerWidth) * 2 - 1;
      const yNorm = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.targetX = xNorm * 2.8;
      mouseRef.current.targetY = yNorm * 1.8;
    };
    window.addEventListener('mousemove', onPointerMove);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      const clickable: THREE.Object3D[] = [];
      nodeGroups.forEach(grp => clickable.push(grp));

      const intersects = raycaster.intersectObjects(clickable, true);
      if (intersects.length > 0) {
        let parent = intersects[0].object;
        while (parent && parent.parent && !nodeGroups.has(parent.name)) {
          parent = parent.parent;
        }
        if (parent && nodeGroups.has(parent.name)) {
          onSelectNode(parent.name);
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // --- 9. Cinematic Camera Transition Engine & Game Loop ---
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth mouse parallax damping
      mouseRef.current.x = THREE.MathUtils.damp(mouseRef.current.x, mouseRef.current.targetX, 3.5, delta);
      mouseRef.current.y = THREE.MathUtils.damp(mouseRef.current.y, mouseRef.current.targetY, 3.5, delta);

      // Smooth Camera Transitions between Mission Sections
      const currentMode = currentCameraModeRef.current;
      if (currentMode === 'overview') {
        // Mission Control panoramic view
        _vec3Target.set(-2 + mouseRef.current.x, 14 + mouseRef.current.y, 52);
        _camTarget.set(6, 0, 0);
      } else if (currentMode === 'network') {
        if (isDisruptionActive) {
          // Smoothly focus camera on the disrupted communication corridor and asteroid cluster
          _vec3Target.set(-4 + mouseRef.current.x * 0.5, 7 + mouseRef.current.y * 0.5, 25);
          _camTarget.set(0, 0, 0);
        } else {
          // Focus on Earth, relay constellation, and active routes
          _vec3Target.set(-8 + mouseRef.current.x * 0.7, 8 + mouseRef.current.y * 0.7, 30);
          _camTarget.set(-2, 1, 0);
        }
      } else if (currentMode === 'exoplanet') {
        // Dramatic framing of host star and edge-on exoplanet transit
        _vec3Target.set(24 + mouseRef.current.x * 0.5, 3.5 + mouseRef.current.y * 0.5, 17);
        _camTarget.set(34, 0, -2);
      }

      // Smoothly damp camera position & lookAt target
      camera.position.x = THREE.MathUtils.damp(camera.position.x, _vec3Target.x, 2.5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _vec3Target.y, 2.5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _vec3Target.z, 2.5, delta);

      controls.target.x = THREE.MathUtils.damp(controls.target.x, _camTarget.x, 3.0, delta);
      controls.target.y = THREE.MathUtils.damp(controls.target.y, _camTarget.y, 3.0, delta);
      controls.target.z = THREE.MathUtils.damp(controls.target.z, _camTarget.z, 3.0, delta);

      // Rotate Earth & cloud atmosphere
      const earthGrp = nodeGroups.get('node-earth');
      if (earthGrp) {
        earthGrp.children[0].rotation.y += delta * 0.12;
      }

      // Rotate Relays
      nodes.filter(n => n.type === 'relay').forEach(n => {
        const grp = nodeGroups.get(n.id);
        if (grp) {
          grp.rotation.y = Math.sin(elapsed * 0.35 + n.position[0]) * 0.12;
        }
      });

      // Pulse Star Corona
      if (starCoronaRef.current) {
        const s = 1.0 + Math.sin(elapsed * 1.8) * 0.04;
        starCoronaRef.current.scale.set(s, s, s);
      }

      // Asteroid Tumbling and orbital drift
      asteroidGroups.forEach(grp => {
        if (grp.visible) {
          grp.children.forEach(child => {
            if (child.userData?.rotSpeed) {
              child.rotation.x += child.userData.rotSpeed[0];
              child.rotation.y += child.userData.rotSpeed[1];
              child.rotation.z += child.userData.rotSpeed[2];
            }
          });
          grp.position.y += Math.sin(elapsed * 0.7) * 0.004;
        }
      });

      // Drift Comet
      if (cometMeshRef.current) {
        cometMeshRef.current.position.x += delta * 0.25;
        cometMeshRef.current.position.y += delta * 0.1;
        if (cometMeshRef.current.position.x > 45) {
          cometMeshRef.current.position.set(-35, -18, 14);
        }
      }

      controls.update();
      renderer.render(scene, camera);

      frameCount++;
      // Hardware-accelerated 2D projection updates directly on DOM transforms (0 React renders)
      if (frameCount % 2 === 0) {
        const curWidth = container.clientWidth || width;
        const curHeight = container.clientHeight || height;
        nodes.forEach(node => {
          const btn = reticleElementsRef.current.get(node.id);
          if (!btn) return;

          _vec3A.set(node.position[0], node.position[1] + 2.8, node.position[2]);
          _vec3A.project(camera);

          const x = ((_vec3A.x + 1) * curWidth) / 2;
          const y = ((-_vec3A.y + 1) * curHeight) / 2;
          const visible = _vec3A.z < 1.0 && x > 20 && x < curWidth - 20 && y > 20 && y < curHeight - 20;

          if (visible) {
            btn.style.transform = `translate3d(${x}px, ${y}px, 0px) translate(-50%, -50%)`;
            btn.style.display = 'block';
          } else {
            btn.style.display = 'none';
          }
        });
      }
    };

    let frameCount = 0;
    animate();

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      cancelAnimationFrame(animId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // --- Dynamic Exoplanet Keplerian Orbit & Transit Position ---
  useEffect(() => {
    if (!transitingPlanetRef.current) return;
    const orbitRadius = 8.0;
    const angle = orbitalPhase * Math.PI * 2;
    const inclination = Math.PI / 2.05; // 87.8° near edge-on

    const x = Math.cos(angle) * orbitRadius;
    const zBase = Math.sin(angle) * orbitRadius;
    const y = -Math.cos(inclination) * zBase;
    const z = Math.sin(inclination) * zBase;

    // First child of transitingPlanetOrbit is exoplanet mesh
    const planetMesh = transitingPlanetRef.current.children[0];
    if (planetMesh) {
      planetMesh.position.set(x, y, z);
    }
  }, [orbitalPhase]);

  // --- Dynamic Link Coloring & Visual State Updates ---
  useEffect(() => {
    const linkLines = linkLinesRef.current;
    if (!linkLines) return;

    const activeLinkIds = new Set<string>();
    if (activeRoute && activeRoute.path.length > 1) {
      for (let i = 0; i < activeRoute.path.length - 1; i++) {
        const u = activeRoute.path[i];
        const v = activeRoute.path[i + 1];
        const link = links.find(
          l => (l.source === u && l.target === v) || (l.source === v && l.target === u)
        );
        if (link) activeLinkIds.add(link.id);
      }
    }

    links.forEach(link => {
      const linePair = linkLines.get(link.id);
      if (!linePair) return;

      const lineMat = linePair.line.material as THREE.LineBasicMaterial;
      const glowMat = linePair.glow.material as THREE.LineBasicMaterial;

      if (link.availability === 'severed' || link.availability === 'obstructed') {
        // Red with high intensity
        lineMat.color.setHex(0xef4444);
        lineMat.opacity = 0.95;
        glowMat.color.setHex(0xb91c1c);
        glowMat.opacity = 0.7;
      } else if (activeLinkIds.has(link.id)) {
        // Luminous bright cyan active route
        lineMat.color.setHex(0x06b6d4);
        lineMat.opacity = 1.0;
        glowMat.color.setHex(0x22d3ee);
        glowMat.opacity = 0.85;
      } else if (link.availability === 'degraded') {
        // Amber degraded
        lineMat.color.setHex(0xf59e0b);
        lineMat.opacity = 0.65;
        glowMat.color.setHex(0xb45309);
        glowMat.opacity = 0.35;
      } else {
        // Standby muted violet/slate
        lineMat.color.setHex(0x6366f1);
        lineMat.opacity = 0.25;
        glowMat.color.setHex(0x4338ca);
        glowMat.opacity = 0.12;
      }
    });
  }, [links, activeRoute]);

  // --- Dynamic Asteroid Visibility & Hazard Perimeter Updates ---
  useEffect(() => {
    const asteroidGroups = asteroidGroupsRef.current;
    if (!asteroidGroups) return;

    asteroidClusters.forEach(cluster => {
      const grp = asteroidGroups.get(cluster.id);
      if (grp) {
        grp.visible = cluster.active;
        const perimeter = grp.getObjectByName('dangerPerimeter') as THREE.Mesh;
        if (perimeter) {
          const mat = perimeter.material as THREE.MeshBasicMaterial;
          mat.opacity = cluster.active ? 0.45 : 0.0;
        }
      }
    });
  }, [asteroidClusters]);

  // --- Directional Data Packet Photons along the Active Path ---
  useEffect(() => {
    const packetsGroup = packetsGroupRef.current;
    if (!packetsGroup) return;

    while (packetsGroup.children.length > 0) {
      packetsGroup.remove(packetsGroup.children[0]);
    }

    if (!activeRoute || activeRoute.path.length < 2 || !isStreaming) return;

    const pathNodes = activeRoute.path
      .map(id => nodes.find(n => n.id === id))
      .filter((n): n is NetworkNode => n !== undefined);

    if (pathNodes.length < 2) return;

    const photonCount = 6;
    for (let i = 0; i < photonCount; i++) {
      const photonMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 })
      );

      const glowShell = new THREE.Mesh(
        new THREE.SphereGeometry(0.78, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending })
      );
      photonMesh.add(glowShell);

      const progressNorm = (packetProgress / 100 + i / photonCount) % 1.0;
      const totalHops = pathNodes.length - 1;
      const hopFloat = progressNorm * totalHops;
      const currentHop = Math.min(totalHops - 1, Math.floor(hopFloat));
      const hopProgress = hopFloat - currentHop;

      const p1 = pathNodes[currentHop].position;
      const p2 = pathNodes[currentHop + 1].position;

      photonMesh.position.set(
        p1[0] + (p2[0] - p1[0]) * hopProgress,
        p1[1] + (p2[1] - p1[1]) * hopProgress,
        p1[2] + (p2[2] - p1[2]) * hopProgress
      );

      packetsGroup.add(photonMesh);
    }
  }, [activeRoute, packetProgress, nodes, isStreaming]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-slate-950 pointer-events-auto">
      {/* Three.js Canvas Container or CSS Fallback */}
      {webGlSupported ? (
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      ) : (
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black relative flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_rgba(245,158,11,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_70%,_rgba(6,182,212,0.12),transparent_50%)]" />
          <div className="text-center font-mono text-xs text-slate-400 p-4 hud-glass rounded-xl border border-slate-800 max-w-md">
            <div className="text-cyan-300 font-bold mb-1">2D COSMIC TELEMETRY FALLBACK ENGAGED</div>
            <div>WebGL acceleration is unavailable in this environment. Full algorithmic routing and exoplanet transit detection remain operational.</div>
          </div>
        </div>
      )}

      {/* Floating 3D-anchored HUD Reticles (Hardware-accelerated direct composite transforms) */}
      {webGlSupported && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {nodes.map(node => {
            const isSelected = node.id === selectedNodeId;
            const dist = `${node.position[0] > 0 ? '+' : ''}${node.position[0]} AU`;

            return (
              <button
                key={node.id}
                ref={el => {
                  if (el) reticleElementsRef.current.set(node.id, el);
                  else reticleElementsRef.current.delete(node.id);
                }}
                type="button"
                onClick={() => onSelectNode(node.id)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  display: 'none',
                  transform: 'translate3d(-9999px, -9999px, 0px)',
                  willChange: 'transform',
                }}
                className={`pointer-events-auto group cursor-pointer transition-transform duration-100 z-10 ${
                  isSelected ? 'scale-110 z-20' : 'hover:scale-105'
                }`}
              >
                {/* Sci-Fi Targeting Brackets */}
                <div className="relative p-1">
                  <span className={`corner-bracket-tl ${isSelected ? 'border-cyan-300' : 'border-cyan-500/50'}`} />
                  <span className={`corner-bracket-tr ${isSelected ? 'border-cyan-300' : 'border-cyan-500/50'}`} />
                  <span className={`corner-bracket-bl ${isSelected ? 'border-cyan-300' : 'border-cyan-500/50'}`} />
                  <span className={`corner-bracket-br ${isSelected ? 'border-cyan-300' : 'border-cyan-500/50'}`} />

                  <div
                    className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1.5 transition ${
                      isSelected
                        ? 'bg-cyan-500/90 text-slate-950 font-bold border border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                        : 'bg-slate-950/70 text-slate-300 group-hover:text-cyan-200 border border-slate-700/60'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-slate-950' : 'bg-cyan-400'}`} />
                    <span>{node.name.split(' ')[0]}</span>
                    <span className="text-[9px] opacity-60">[{dist}]</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
