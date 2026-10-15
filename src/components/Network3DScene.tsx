/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ORBITAL X — Cinematic 3D Autonomous Communication Network
 * Procedural Three.js Scene: Earth, Relays, Deep Space Craft, Host Star,
 * Asteroid Swarms, Dynamic Laser Links, and Animated Data Photons.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NetworkNode, NetworkLink, RouteResult, AsteroidCluster } from '../types/network';

interface Network3DSceneProps {
  nodes: NetworkNode[];
  links: NetworkLink[];
  activeRoute: RouteResult | null;
  asteroidClusters: AsteroidCluster[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  packetProgress: number; // 0 to 100
  isStreaming: boolean;
}

// Module-scope temporary vectors for zero-garbage-collection render loop
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();

export const Network3DScene: React.FC<Network3DSceneProps> = ({
  nodes,
  links,
  activeRoute,
  asteroidClusters,
  selectedNodeId,
  onSelectNode,
  packetProgress,
  isStreaming,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // References to dynamic 3D meshes for live update without tearing down WebGL
  const nodeMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const linkLinesRef = useRef<Map<string, { line: THREE.Line; glow: THREE.Line }>>(new Map());
  const asteroidGroupsRef = useRef<Map<string, THREE.Group>>(new Map());
  const packetsGroupRef = useRef<THREE.Group | null>(null);

  // Screen positions for projected 2D HUD labels
  const [screenLabels, setScreenLabels] = useState<Array<{ id: string; name: string; type: string; x: number; y: number; visible: boolean }>>([]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- 1. Three.js Scene, Camera & Renderer Setup ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.012);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(-2, 28, 48);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(0x030712);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 120;
    controls.minDistance = 8;
    controls.maxPolarAngle = Math.PI / 2 + 0.15; // Allow slight low angle view
    controls.target.set(2, 0, 0);
    controlsRef.current = controls;

    // --- 2. Lighting Rig (Warm Key + Cool Hemisphere + Subtle Fill) ---
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.2);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x020617, 0.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.4);
    keyLight.position.set(20, 30, 25);
    scene.add(keyLight);

    const starGlowLight = new THREE.PointLight(0xf59e0b, 3.5, 80);
    starGlowLight.position.set(30, 0, 0);
    scene.add(starGlowLight);

    // --- 3. Procedural Starfield Particle Backdrop ---
    const starCount = 1800;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      const radius = 90 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      starPositions[idx] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[idx + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[idx + 2] = radius * Math.cos(phi);

      const colorTint = Math.random();
      if (colorTint > 0.8) {
        starColors[idx] = 0.4; starColors[idx + 1] = 0.7; starColors[idx + 2] = 1.0; // Cyan/blue
      } else if (colorTint > 0.6) {
        starColors[idx] = 1.0; starColors[idx + 1] = 0.8; starColors[idx + 2] = 0.5; // Warm
      } else {
        starColors[idx] = 0.9; starColors[idx + 1] = 0.95; starColors[idx + 2] = 1.0; // White
      }
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMaterial = new THREE.PointsMaterial({
      size: 1.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const starPoints = new THREE.Points(starGeometry, starMaterial);
    scene.add(starPoints);

    // Coordinate grid plane (Deep-space navigation datum)
    const gridHelper = new THREE.GridHelper(90, 45, 0x1e293b, 0x090f1d);
    gridHelper.position.y = -8;
    scene.add(gridHelper);

    // Group for dynamic packets
    const packetsGroup = new THREE.Group();
    scene.add(packetsGroup);
    packetsGroupRef.current = packetsGroup;

    // --- 4. Procedural Procedural Generation Helpers ---

    // Procedural Earth Texture on Canvas
    function createEarthTexture(): THREE.CanvasTexture {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      // Deep Ocean
      ctx.fillStyle = '#0f2b5c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Procedural Continents
      ctx.fillStyle = '#1e5f38';
      for (let i = 0; i < 20; i++) {
        const x = (Math.sin(i * 1.5) * 0.4 + 0.5) * canvas.width;
        const y = (Math.cos(i * 1.2) * 0.35 + 0.5) * canvas.height;
        const r = 25 + Math.random() * 45;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Swirling Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 15; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.beginPath();
        ctx.ellipse(x, y, 40 + Math.random() * 60, 10 + Math.random() * 15, Math.random(), 0, Math.PI * 2);
        ctx.fill();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }

    // Procedural Asteroid Noise Texture
    function createRockTexture(): THREE.CanvasTexture {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, 256, 256);

      for (let i = 0; i < 350; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const r = 1 + Math.random() * 4;
        ctx.fillStyle = Math.random() > 0.5 ? '#1e293b' : '#475569';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }

    const earthTexture = createEarthTexture();
    const rockTexture = createRockTexture();

    // --- 5. Build Procedural Node Models (3-12 Parts Each) ---
    const nodeGroups = new Map<string, THREE.Group>();

    nodes.forEach(node => {
      const group = new THREE.Group();
      group.position.set(node.position[0], node.position[1], node.position[2]);
      group.name = node.id;

      if (node.type === 'earth') {
        // Earth Model: Core + Atmosphere Shell + Orbital Station Ring
        const earthSphere = new THREE.Mesh(
          new THREE.SphereGeometry(2.4, 32, 32),
          new THREE.MeshStandardMaterial({
            map: earthTexture,
            roughness: 0.6,
            metalness: 0.1,
          })
        );
        group.add(earthSphere);

        // Atmosphere Glow Shell
        const atmosphere = new THREE.Mesh(
          new THREE.SphereGeometry(2.65, 32, 32),
          new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.22,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
          })
        );
        group.add(atmosphere);

        // Ground DSN Dish Beacon
        const dsnDish = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.05, 0.4, 16),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 })
        );
        dsnDish.position.set(1.9, 1.2, 0.8);
        dsnDish.lookAt(20, 0, 0);
        group.add(dsnDish);

        // Orbital Ring
        const ringGeo = new THREE.RingGeometry(3.3, 3.4, 48);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

      } else if (node.type === 'relay') {
        // Multi-Part Autonomous Relay Station
        // 1. Central bus
        const core = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 1.4, 8),
          new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 })
        );
        group.add(core);

        // 2 & 3. Solar Array Wings
        const solarWingGeo = new THREE.BoxGeometry(2.2, 0.06, 0.8);
        const solarMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.9, roughness: 0.15 });

        const wingLeft = new THREE.Mesh(solarWingGeo, solarMat);
        wingLeft.position.set(-1.6, 0, 0);
        group.add(wingLeft);

        const wingRight = new THREE.Mesh(solarWingGeo, solarMat);
        wingRight.position.set(1.6, 0, 0);
        group.add(wingRight);

        // 4. Parabolic Dish Antenna
        const dish = new THREE.Mesh(
          new THREE.SphereGeometry(0.7, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2.2),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide })
        );
        dish.position.set(0, 0.8, 0);
        dish.rotation.x = -Math.PI / 2.5;
        group.add(dish);

        // 5. Phased Array Feeder Mast
        const feed = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 0.6),
          new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.9, roughness: 0.1 })
        );
        feed.position.set(0, 1.1, 0.4);
        group.add(feed);

        // 6. Navigation / Relay LED ring
        const ledRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.75, 0.04, 8, 24),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        );
        ledRing.rotation.x = Math.PI / 2;
        group.add(ledRing);

      } else if (node.type === 'spacecraft') {
        // Deep Space Spacecraft "Orbital-X Surveyor"
        // 1. Main cylindrical instrument body
        const hull = new THREE.Mesh(
          new THREE.CylinderGeometry(0.65, 0.8, 2.2, 12),
          new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.25 })
        );
        hull.rotation.z = Math.PI / 2;
        group.add(hull);

        // 2. High Aperture Exoplanet Photometer Telescope Lens
        const lensCone = new THREE.Mesh(
          new THREE.CylinderGeometry(0.85, 0.65, 1.1, 16),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 })
        );
        lensCone.rotation.z = Math.PI / 2;
        lensCone.position.set(1.4, 0, 0);
        group.add(lensCone);

        // Optical detector glass
        const lensGlass = new THREE.Mesh(
          new THREE.CircleGeometry(0.78, 24),
          new THREE.MeshPhysicalMaterial({
            color: 0x38bdf8,
            transmission: 0.9,
            roughness: 0.05,
            ior: 1.5,
          })
        );
        lensGlass.position.set(1.96, 0, 0);
        lensGlass.rotation.y = Math.PI / 2;
        group.add(lensGlass);

        // 3. Gold Foil Wrapped Avionics Pod
        const goldBox = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.9, 0.9),
          new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.95, roughness: 0.3 })
        );
        goldBox.position.set(-0.5, 0.8, 0);
        group.add(goldBox);

        // 4. High-Gain Directional Dish pointing back to inner system
        const dish = new THREE.Mesh(
          new THREE.SphereGeometry(0.8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2.2),
          new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.7, roughness: 0.2, side: THREE.DoubleSide })
        );
        dish.position.set(-1.4, 0, 0);
        dish.rotation.y = -Math.PI / 2;
        group.add(dish);

        // 5. Dual Radiator Wings
        const radWing = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 2.4, 1.0),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.6 })
        );
        radWing.position.set(0, 0, 1.2);
        group.add(radWing);

      } else if (node.type === 'target_system') {
        // Target Star System (Luminous Star with Coronal Flare & Orbiting Exoplanet)
        // Host Star Core
        const star = new THREE.Mesh(
          new THREE.SphereGeometry(2.8, 32, 32),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
        );
        group.add(star);

        // Corona Halo
        const corona = new THREE.Mesh(
          new THREE.SphereGeometry(3.6, 32, 32),
          new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            transparent: true,
            opacity: 0.25,
            blending: THREE.AdditiveBlending,
          })
        );
        group.add(corona);

        // Outer Stellar Wind Shell
        const outerHalo = new THREE.Mesh(
          new THREE.SphereGeometry(4.6, 24, 24),
          new THREE.MeshBasicMaterial({
            color: 0xef4444,
            transparent: true,
            opacity: 0.12,
            blending: THREE.AdditiveBlending,
          })
        );
        group.add(outerHalo);

        // Target Orbiting Exoplanet (TRAPPIST-1e proxy)
        const planetOrbitGroup = new THREE.Group();
        planetOrbitGroup.name = 'targetPlanetOrbit';
        const exoplanet = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.7 })
        );
        exoplanet.position.set(6.2, 0, 0);
        planetOrbitGroup.add(exoplanet);
        group.add(planetOrbitGroup);

        // Target Orbit Track
        const orbitTrack = new THREE.Mesh(
          new THREE.RingGeometry(6.15, 6.25, 48),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
        );
        orbitTrack.rotation.x = Math.PI / 2;
        group.add(orbitTrack);
      }

      scene.add(group);
      nodeGroups.set(node.id, group);
    });

    nodeMeshesRef.current = nodeGroups;

    // --- 6. Build Asteroid Clusters (Procedural Boulders & Particle Gas) ---
    const asteroidGroups = new Map<string, THREE.Group>();

    asteroidClusters.forEach(cluster => {
      const clusterGroup = new THREE.Group();
      clusterGroup.position.set(cluster.position[0], cluster.position[1], cluster.position[2]);
      clusterGroup.name = cluster.id;

      // Group of 18-24 irregular rocky boulders
      const boulderCount = 22;
      for (let i = 0; i < boulderCount; i++) {
        const radius = 0.35 + Math.random() * 0.75;
        const boulderGeo = new THREE.DodecahedronGeometry(radius, 1);

        // Displace vertices randomly for procedural craggy rock silhouette
        const posAttr = boulderGeo.attributes.position;
        for (let v = 0; v < posAttr.count; v++) {
          const vx = posAttr.getX(v) * (1 + (Math.random() - 0.5) * 0.35);
          const vy = posAttr.getY(v) * (1 + (Math.random() - 0.5) * 0.35);
          const vz = posAttr.getZ(v) * (1 + (Math.random() - 0.5) * 0.35);
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
        const elev = (Math.random() - 0.5) * cluster.radius * 0.8;
        boulder.position.set(Math.cos(ang) * dist, elev, Math.sin(ang) * dist);
        boulder.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        boulder.userData = {
          rotSpeed: [(Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02],
        };
        clusterGroup.add(boulder);
      }

      // Comet Dust / Asteroid Debris Cloud
      const dustCount = 80;
      const dustGeo = new THREE.BufferGeometry();
      const dustPos = new Float32Array(dustCount * 3);
      for (let d = 0; d < dustCount; d++) {
        const dIdx = d * 3;
        dustPos[dIdx] = (Math.random() - 0.5) * cluster.radius * 2.2;
        dustPos[dIdx + 1] = (Math.random() - 0.5) * cluster.radius * 1.5;
        dustPos[dIdx + 2] = (Math.random() - 0.5) * cluster.radius * 2.2;
      }
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
      const dustMat = new THREE.PointsMaterial({
        size: 0.7,
        color: cluster.type === 'comet_coma' ? 0x38bdf8 : 0xf97316,
        transparent: true,
        opacity: 0.6,
      });
      clusterGroup.add(new THREE.Points(dustGeo, dustMat));

      // Danger Perimeter Wireframe (indicates simulated RF occlusion zone)
      const perimeterGeo = new THREE.SphereGeometry(cluster.radius, 16, 12);
      const perimeterMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        wireframe: true,
        transparent: true,
        opacity: cluster.active ? 0.35 : 0.0,
      });
      const perimeterMesh = new THREE.Mesh(perimeterGeo, perimeterMat);
      perimeterMesh.name = 'dangerPerimeter';
      clusterGroup.add(perimeterMesh);

      clusterGroup.visible = cluster.active;
      scene.add(clusterGroup);
      asteroidGroups.set(cluster.id, clusterGroup);
    });

    asteroidGroupsRef.current = asteroidGroups;

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
        color: 0x475569, // Default standby
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

    // --- 8. Mouse Raycasting for Node Selection ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Raycast against all node groups
      const clickableObjects: THREE.Object3D[] = [];
      nodeGroups.forEach(grp => clickableObjects.push(grp));

      const intersects = raycaster.intersectObjects(clickableObjects, true);
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

    // --- 9. Animation & Render Loop ---
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Rotate Earth & cloud layer
      const earthGrp = nodeGroups.get('node-earth');
      if (earthGrp) {
        earthGrp.children[0].rotation.y += delta * 0.15;
        if (earthGrp.children[1]) earthGrp.children[1].rotation.y += delta * 0.18;
      }

      // Rotate Relays & Solar Panels slightly toward celestial center
      nodes.filter(n => n.type === 'relay').forEach(n => {
        const grp = nodeGroups.get(n.id);
        if (grp) {
          grp.rotation.y = Math.sin(elapsed * 0.4 + n.position[0]) * 0.15;
        }
      });

      // Target star system exoplanet orbit
      const targetGrp = nodeGroups.get('node-target-system');
      if (targetGrp) {
        const planetOrbit = targetGrp.getObjectByName('targetPlanetOrbit');
        if (planetOrbit) {
          planetOrbit.rotation.y += delta * 0.45;
        }
        // Corona pulse
        const corona = targetGrp.children[1];
        if (corona) {
          const s = 1 + Math.sin(elapsed * 2.0) * 0.03;
          corona.scale.set(s, s, s);
        }
      }

      // Animate Asteroid Tumbling and Drifting
      asteroidGroups.forEach(grp => {
        if (grp.visible) {
          grp.children.forEach(child => {
            if (child.userData?.rotSpeed) {
              child.rotation.x += child.userData.rotSpeed[0];
              child.rotation.y += child.userData.rotSpeed[1];
              child.rotation.z += child.userData.rotSpeed[2];
            }
          });
          // Slow orbital oscillation
          grp.position.y += Math.sin(elapsed * 0.8) * 0.005;
        }
      });

      controls.update();
      renderer.render(scene, camera);

      // Project 3D Node positions to 2D screen coordinates for lightweight HUD labels
      const tempLabels = nodes.map(node => {
        _vec3A.set(node.position[0], node.position[1] + 2.8, node.position[2]);
        _vec3A.project(camera);

        const x = ((_vec3A.x + 1) * width) / 2;
        const y = ((-_vec3A.y + 1) * height) / 2;
        const visible = _vec3A.z < 1.0 && x > 20 && x < width - 20 && y > 20 && y < height - 20;

        return {
          id: node.id,
          name: node.name.split(' ')[0], // Compact label
          type: node.type,
          x,
          y,
          visible,
        };
      });

      setScreenLabels(tempLabels);
    };

    animate();

    // --- 10. Window Resize Handler ---
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight || 500;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []); // Run setup once

  // --- Dynamic Link Coloring & Visual State Updates ---
  useEffect(() => {
    const linkLines = linkLinesRef.current;
    if (!linkLines) return;

    // Set of link IDs in the current active Dijkstra path
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
        // Severed / Occluded by asteroid swarm: RED
        lineMat.color.setHex(0xef4444);
        lineMat.opacity = 0.9;
        glowMat.color.setHex(0xb91c1c);
        glowMat.opacity = 0.6;
      } else if (activeLinkIds.has(link.id)) {
        // Active Route Chosen by Dijkstra: BRIGHT CYAN
        lineMat.color.setHex(0x06b6d4);
        lineMat.opacity = 1.0;
        glowMat.color.setHex(0x22d3ee);
        glowMat.opacity = 0.8;
      } else if (link.availability === 'degraded') {
        // Degraded: AMBER
        lineMat.color.setHex(0xf59e0b);
        lineMat.opacity = 0.6;
        glowMat.color.setHex(0xb45309);
        glowMat.opacity = 0.3;
      } else {
        // Standby Operational Relay Connection: MUTED VIOLET / SLATE
        lineMat.color.setHex(0x6366f1);
        lineMat.opacity = 0.28;
        glowMat.color.setHex(0x4338ca);
        glowMat.opacity = 0.15;
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
          mat.opacity = cluster.active ? 0.4 : 0.0;
        }
      }
    });
  }, [asteroidClusters]);

  // --- Directional Data Packet Photons along the Active Path ---
  useEffect(() => {
    const packetsGroup = packetsGroupRef.current;
    if (!packetsGroup) return;

    // Clear old packet meshes
    while (packetsGroup.children.length > 0) {
      const obj = packetsGroup.children[0];
      packetsGroup.remove(obj);
    }

    if (!activeRoute || activeRoute.path.length < 2) return;

    // Build points of the path
    const pathNodes = activeRoute.path
      .map(id => nodes.find(n => n.id === id))
      .filter((n): n is NetworkNode => n !== undefined);

    if (pathNodes.length < 2) return;

    // Create 3 glowing data photon pulses traversing hops
    const photonCount = 5;
    for (let i = 0; i < photonCount; i++) {
      const photonMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 12, 12),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.95,
        })
      );

      const glowShell = new THREE.Mesh(
        new THREE.SphereGeometry(0.68, 12, 12),
        new THREE.MeshBasicMaterial({
          color: 0x06b6d4,
          transparent: true,
          opacity: 0.6,
          blending: THREE.AdditiveBlending,
        })
      );
      photonMesh.add(glowShell);

      // Position along the path based on packetProgress & offset
      const progressNorm = ((packetProgress / 100) + (i / photonCount)) % 1.0;
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
  }, [activeRoute, packetProgress, nodes]);

  // Camera preset focus when node is selected
  useEffect(() => {
    if (!selectedNodeId || !controlsRef.current || !cameraRef.current) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (node) {
      controlsRef.current.target.set(node.position[0], node.position[1], node.position[2]);
    }
  }, [selectedNodeId, nodes]);

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden bg-slate-950 rounded-xl border border-slate-800 shadow-2xl">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 3D Viewport Header Badges */}
      <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 pointer-events-none z-10">
        <div className="px-3 py-1 bg-slate-900/90 border border-cyan-500/40 rounded text-xs font-mono text-cyan-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          AUTONOMOUS 3D RELAY TOPOLOGY
        </div>
        <div className="px-2.5 py-1 bg-slate-900/80 border border-slate-700 rounded text-xs font-mono text-slate-400">
          PROJECTION: HELIOCENTRIC J2000
        </div>
      </div>

      {/* Legend Overlay at Top-Right */}
      <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-300 flex flex-col gap-1.5 pointer-events-none z-10 max-w-xs">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800 pb-1">3D Beam Spectrum</div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 bg-cyan-400 rounded-full"></span>
          <span className="text-cyan-300">Active Dijkstra Path</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 bg-red-500 rounded-full"></span>
          <span className="text-red-400">Asteroid Severed Link</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 bg-indigo-400/80 rounded-full"></span>
          <span className="text-indigo-300">Standby Relay Link</span>
        </div>
      </div>

      {/* Lightweight Projected 2D Node Labels */}
      {screenLabels.map(label => {
        if (!label.visible) return null;
        const isSelected = label.id === selectedNodeId;
        return (
          <button
            key={label.id}
            type="button"
            onClick={() => onSelectNode(label.id)}
            style={{ left: `${label.x}px`, top: `${label.y}px` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto px-2 py-0.5 rounded text-[11px] font-mono transition-all duration-150 cursor-pointer ${
              isSelected
                ? 'bg-cyan-500 text-slate-950 font-bold border border-cyan-300 shadow-lg shadow-cyan-500/40 scale-110 z-20'
                : 'bg-slate-900/80 text-slate-300 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-500/60 z-10'
            }`}
          >
            {label.name}
          </button>
        );
      })}

      {/* Camera Reset & View Controls (Bottom-Right) */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
        <button
          type="button"
          onClick={() => {
            if (controlsRef.current && cameraRef.current) {
              cameraRef.current.position.set(-2, 28, 48);
              controlsRef.current.target.set(2, 0, 0);
              controlsRef.current.update();
              onSelectNode(null);
            }
          }}
          className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer shadow-lg"
        >
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset Camera
        </button>
      </div>
    </div>
  );
};
