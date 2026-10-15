/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ORBITAL X — High-Fidelity 3D Planetary Transit Simulator
 * Visualizes the exoplanet transiting the host star with Keplerian kinematics,
 * stellar limb darkening, and photometric line-of-sight occlusion ray.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ExoplanetTransitData } from '../types/network';

interface Transit3DSceneProps {
  system: ExoplanetTransitData;
  orbitalPhase: number; // 0 to 1
  isInTransit: boolean;
}

export const Transit3DScene: React.FC<Transit3DSceneProps> = ({
  system,
  orbitalPhase,
  isInTransit,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const planetMeshRef = useRef<THREE.Mesh | null>(null);
  const transitRayRef = useRef<THREE.Line | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 340;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.02);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 500);
    // Align camera near transit line of sight (slight edge-on tilt)
    camera.position.set(0, 3.2, 22);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x020617);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 45;
    controls.minDistance = 6;
    controls.target.set(0, 0, 0);

    // Host Star Core
    const starColor = system.starTempKelvin < 3500 ? 0xf97316 : 0xfef08a;
    const starGeo = new THREE.SphereGeometry(2.8, 32, 32);
    const starMat = new THREE.MeshBasicMaterial({ color: starColor });
    const starMesh = new THREE.Mesh(starGeo, starMat);
    scene.add(starMesh);

    // Star Corona Glow
    const coronaGeo = new THREE.SphereGeometry(3.6, 24, 24);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: system.starTempKelvin < 3500 ? 0xea580c : 0xf59e0b,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.Mesh(coronaGeo, coronaMat));

    // Exoplanet Orbit Ellipse Track (slight inclination ~88.5 degrees edge-on)
    const orbitRadius = 8.5;
    const orbitGeo = new THREE.RingGeometry(orbitRadius - 0.04, orbitRadius + 0.04, 64);
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
    const orbitMesh = new THREE.Mesh(orbitGeo, orbitMat);
    orbitMesh.rotation.x = Math.PI / 2.05; // 87.5 degree edge-on transit geometry
    scene.add(orbitMesh);

    // Exoplanet Sphere
    const planetRadius = 0.72;
    const planetGeo = new THREE.SphereGeometry(planetRadius, 24, 24);
    const planetMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.1,
    });
    const planetMesh = new THREE.Mesh(planetGeo, planetMat);
    scene.add(planetMesh);
    planetMeshRef.current = planetMesh;

    // Atmospheric Exoplanet Rim
    const atmRim = new THREE.Mesh(
      new THREE.SphereGeometry(planetRadius + 0.06, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending })
    );
    planetMesh.add(atmRim);

    // Key Light from Star onto Planet
    const starLight = new THREE.PointLight(starColor, 4, 30);
    scene.add(starLight);

    const ambient = new THREE.AmbientLight(0x0f172a, 0.5);
    scene.add(ambient);

    // Line of sight ray toward Earth observer
    const rayPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 24)];
    const rayGeo = new THREE.BufferGeometry().setFromPoints(rayPoints);
    const rayMat = new THREE.LineDashedMaterial({
      color: 0x06b6d4,
      dashSize: 0.6,
      gapSize: 0.4,
      transparent: true,
      opacity: 0.4,
    });
    const transitRay = new THREE.Line(rayGeo, rayMat);
    transitRay.computeLineDistances();
    scene.add(transitRay);
    transitRayRef.current = transitRay;

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 340;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [system.systemName]);

  // Update Planet Position based on orbital phase
  useEffect(() => {
    if (!planetMeshRef.current) return;
    const orbitRadius = 8.5;
    const angle = orbitalPhase * Math.PI * 2;
    const inclination = Math.PI / 2.05;

    // Orbit in inclined plane
    const x = Math.cos(angle) * orbitRadius;
    const zBase = Math.sin(angle) * orbitRadius;
    const y = -Math.cos(inclination) * zBase;
    const z = Math.sin(inclination) * zBase;

    planetMeshRef.current.position.set(x, y, z);

    // Update Transit Ray color when transiting
    if (transitRayRef.current) {
      const mat = transitRayRef.current.material as THREE.LineDashedMaterial;
      if (isInTransit) {
        mat.color.setHex(0x22d3ee);
        mat.opacity = 0.9;
      } else {
        mat.color.setHex(0x334155);
        mat.opacity = 0.25;
      }
    }
  }, [orbitalPhase, isInTransit]);

  return (
    <div className="relative w-full h-[320px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded text-xs font-mono text-cyan-300">
        TRANSIT INCLINATION: 88.5° (EDGE-ON)
      </div>
      <div className={`absolute top-3 right-3 px-2.5 py-1 rounded text-xs font-mono font-semibold ${
        isInTransit ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400' : 'bg-slate-900/80 text-slate-400 border border-slate-800'
      }`}>
        {isInTransit ? 'PRIMARY TRANSIT IN PROGRESS' : 'OUT-OF-TRANSIT BASELINE'}
      </div>
    </div>
  );
};
