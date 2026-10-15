/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ORBITAL X — Cinematic 3D Autonomous Space Communication & Exoplanet Hunter
 * 
 * Presentation Layer Redesign:
 * - Unobstructed full-screen living 3D universe.
 * - Minimal top-edge navigation bar with mode switcher and benchmark selectors.
 * - Compact left-edge status HUD (when relevant).
 * - Compact right-edge transit telemetry / light curve HUD (when relevant).
 * - Exactly two clear animated sci-fi primary actions at bottom center.
 * - Full algorithm preservation: custom Dijkstra routing, asteroid disruption,
 *   disconnected handling, and photometric BLS transit detection.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  NetworkNode,
  NetworkLink,
  RouteResult,
  AsteroidCluster,
  TelemetryState,
  CommStatus,
  ScenarioType,
  TransitAnalysisResult,
} from './types/network';
import {
  INITIAL_NETWORK_NODES,
  INITIAL_NETWORK_LINKS,
  ASTEROID_CLUSTERS_CONFIG,
} from './data/networkTopology';
import { EXOPLANET_CATALOG, CatalogTarget } from './data/exoplanetCatalog';
import { findShortestPath, detectFailedLinks } from './algorithms/dijkstra';
import { HeaderNav, NavSection } from './components/HeaderNav';
import { CinematicSpaceCanvas } from './components/CinematicSpaceCanvas';
import { MissionControlHUD } from './components/MissionControlHUD';
import { AdaptiveNetworkHUD } from './components/AdaptiveNetworkHUD';
import { ExoplanetLabHUD } from './components/ExoplanetLabHUD';
import { MissionReportModal } from './components/MissionReportModal';

export default function App() {
  // App renders immediately — zero blocking loading screen
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);

  // Network & Graph Topology
  const [nodes, setNodes] = useState<NetworkNode[]>(INITIAL_NETWORK_NODES);
  const [links, setLinks] = useState<NetworkLink[]>(INITIAL_NETWORK_LINKS);
  const [asteroidClusters, setAsteroidClusters] = useState<AsteroidCluster[]>(ASTEROID_CLUSTERS_CONFIG);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Routing State
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [previousRoute, setPreviousRoute] = useState<RouteResult | null>(null);
  const [commStatus, setCommStatus] = useState<CommStatus>('ONLINE');
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('scenario-1-normal');

  // Observation Telemetry & Photometric Packet Stream
  const [targetSystem, setTargetSystem] = useState<CatalogTarget>(EXOPLANET_CATALOG[0]);
  const [packetProgress, setPacketProgress] = useState<number>(55);
  const [packetsDelivered, setPacketsDelivered] = useState<number>(14);
  const [dataDelivered, setDataDelivered] = useState<boolean>(true);
  const [candidateReport, setCandidateReport] = useState<TransitAnalysisResult | null>(null);

  // Keplerian Orbital Kinematics & Transit Synchronization
  const [orbitalPhase, setOrbitalPhase] = useState<number>(0.2);
  const [isOrbitPlaying, setIsOrbitPlaying] = useState<boolean>(true);

  // Helper flags
  const isDirectBlocked = asteroidClusters.some(c => c.id === 'cluster-apophis-omega' && c.active);
  const isInTransit = orbitalPhase >= 0.46 && orbitalPhase <= 0.54;

  /**
   * Smooth, efficient orbital phase progression
   * Updates at 16fps (60ms) for fluid marker tracking without React render thrashing
   */
  useEffect(() => {
    if (!isOrbitPlaying) return;

    // Orbit period: 16 seconds full loop (~0.0625/sec)
    const step = 0.060 / 16.0;
    const interval = setInterval(() => {
      setOrbitalPhase(prev => (prev + step) % 1.0);
    }, 60);

    return () => clearInterval(interval);
  }, [isOrbitPlaying]);

  /**
   * Custom Dijkstra Route Solver
   */
  const executeRouting = useCallback(
    (currentNodes: NetworkNode[], currentLinks: NetworkLink[]) => {
      const sourceId = 'node-earth';
      const destinationId = 'node-craft-surveyor';

      const newRoute = findShortestPath(currentNodes, currentLinks, sourceId, destinationId);

      if (!newRoute) {
        setCommStatus('OFFLINE');
        setActiveRoute(null);
        setDataDelivered(false);
        return null;
      }

      setActiveRoute(prev => {
        if (prev && JSON.stringify(prev.path) !== JSON.stringify(newRoute.path)) {
          setPreviousRoute(prev);
        }
        return newRoute;
      });

      setCommStatus('ONLINE');
      return newRoute;
    },
    []
  );

  // Initial routing calculation
  useEffect(() => {
    executeRouting(nodes, links);
  }, []);

  // Continuous Simulated Data Packet Stream (Active when online)
  useEffect(() => {
    if (commStatus === 'OFFLINE') {
      setDataDelivered(false);
      return;
    }

    const interval = setInterval(() => {
      setPacketProgress(prev => {
        if (prev >= 100) {
          setPacketsDelivered(d => d + 1);
          setDataDelivered(true);
          return 0;
        }
        return prev + 3.5;
      });
    }, 160);

    return () => clearInterval(interval);
  }, [commStatus]);

  /**
   * Action: SIMULATE ASTEROID DISRUPTION (Scenario 2)
   */
  const handleSimulateDisruption = useCallback(() => {
    setActiveScenario('scenario-2-direct-blocked');
    setCommStatus('REROUTING');

    // If on overview, transition camera to network view to highlight the corridor
    if (activeSection === 'overview') {
      setActiveSection('network');
    }

    // 1. Move asteroid swarm into direct corridor
    const updatedClusters = asteroidClusters.map(c => {
      if (c.id === 'cluster-apophis-omega') {
        return { ...c, active: true };
      }
      return c;
    });
    setAsteroidClusters(updatedClusters);

    // 2. Sever direct link
    const updatedLinks = links.map(link => {
      if (link.id === 'link-earth-surveyor') {
        return {
          ...link,
          availability: 'severed' as const,
          interferenceFactor: 1.0,
          interruptedBy: 'Asteroid Swarm Apophis-Omega (Fresnel Zone Blockade)',
        };
      }
      return link;
    });
    setLinks(updatedLinks);

    // 3. Briefly pause packet delivery while re-routing
    setDataDelivered(false);

    // 4. Autonomous Dijkstra route recovery
    setTimeout(() => {
      const recoveredRoute = executeRouting(nodes, updatedLinks);
      if (recoveredRoute) {
        setTimeout(() => {
          setDataDelivered(true);
        }, 500);
      }
    }, 450);
  }, [asteroidClusters, links, nodes, activeSection, executeRouting]);

  /**
   * Action: TRIGGER SECOND DISRUPTION (Scenario 3 - Disconnected)
   */
  const handleTriggerSecondDisruption = useCallback(() => {
    setActiveScenario('scenario-3-disconnected');
    setCommStatus('OFFLINE');

    const updatedClusters = asteroidClusters.map(c => ({ ...c, active: true }));
    setAsteroidClusters(updatedClusters);

    const updatedLinks = links.map(link => {
      if (
        link.id === 'link-earth-surveyor' ||
        link.id === 'link-ceres-surveyor' ||
        link.id === 'link-europa-surveyor'
      ) {
        return {
          ...link,
          availability: 'severed' as const,
          interferenceFactor: 1.0,
          interruptedBy: 'Hyperbolic Comet Cloud C/2026-X1 (Total Sector Occlusion)',
        };
      }
      return link;
    });
    setLinks(updatedLinks);

    executeRouting(nodes, updatedLinks);
    setDataDelivered(false);
  }, [asteroidClusters, links, nodes, executeRouting]);

  /**
   * Action: RESTORE COMMUNICATION (Scenario 1)
   */
  const handleRestoreCommunication = useCallback(() => {
    setActiveScenario('scenario-1-normal');
    setCommStatus('ONLINE');

    const updatedClusters = asteroidClusters.map(c => ({ ...c, active: false }));
    setAsteroidClusters(updatedClusters);

    const updatedLinks = INITIAL_NETWORK_LINKS.map(l => ({ ...l }));
    setLinks(updatedLinks);

    executeRouting(nodes, updatedLinks);
    setDataDelivered(true);
  }, [asteroidClusters, nodes, executeRouting]);

  /**
   * Reset Network Baseline
   */
  const handleResetNetwork = useCallback(() => {
    handleRestoreCommunication();
    setSelectedNodeId(null);
    setCandidateReport(null);
  }, [handleRestoreCommunication]);

  /**
   * Scenario quick switcher for judges
   */
  const handleSelectScenario = useCallback(
    (scenario: ScenarioType) => {
      if (scenario === 'scenario-1-normal') {
        handleRestoreCommunication();
      } else if (scenario === 'scenario-2-direct-blocked') {
        handleSimulateDisruption();
      } else if (scenario === 'scenario-3-disconnected') {
        handleTriggerSecondDisruption();
      }
    },
    [handleRestoreCommunication, handleSimulateDisruption, handleTriggerSecondDisruption]
  );

  /**
   * Primary Action: INITIATE SCAN (Cinematic glide to transit analysis)
   */
  const handleInitiateScan = () => {
    setActiveSection('exoplanet');
    setOrbitalPhase(0.48); // Snap to transit window
  };

  /**
   * Reset perspective camera view
   */
  const handleResetView = () => {
    setActiveSection('overview');
    setSelectedNodeId(null);
  };

  // Derived telemetry metrics calculated from the current graph
  const failedLinks = detectFailedLinks(links);
  const availableRelays = nodes.filter(n => n.type === 'relay' && n.status === 'online').length;
  const totalRelays = nodes.filter(n => n.type === 'relay').length;

  const telemetryState: TelemetryState = {
    commStatus,
    activePath: activeRoute ? activeRoute.path : [],
    previousPath: previousRoute ? previousRoute.path : null,
    routeResult: activeRoute,
    availableRelaysCount: availableRelays,
    totalRelaysCount: totalRelays,
    disruptedLinksCount: failedLinks.length,
    totalLinksCount: links.length,
    totalCost: activeRoute ? activeRoute.totalCost : Infinity,
    estimatedLatencyMs: activeRoute ? activeRoute.totalLatencyMs : 0,
    linkQuality: activeRoute ? activeRoute.averageQuality : 0,
    dataDeliveryStatus:
      commStatus === 'OFFLINE'
        ? 'OFFLINE'
        : commStatus === 'REROUTING'
        ? 'PAUSED'
        : dataDelivered
        ? 'STREAMING'
        : 'PAUSED',
    dataPacketProgress: commStatus === 'OFFLINE' ? 0 : packetProgress,
    packetsDelivered,
    reroutingActive: commStatus === 'REROUTING',
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      {/* 1. Full-Screen Cinematic 3D Cosmos Canvas (Occupies Entire Viewport Edge-to-Edge) */}
      <CinematicSpaceCanvas
        cameraMode={activeSection}
        isDisruptionActive={isDirectBlocked}
        nodes={nodes}
        links={links}
        activeRoute={activeRoute}
        asteroidClusters={asteroidClusters}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
        targetSystem={targetSystem}
        orbitalPhase={orbitalPhase}
        packetProgress={packetProgress}
        isStreaming={commStatus !== 'OFFLINE'}
        isInTransit={isInTransit}
        onResetView={handleResetView}
      />

      {/* 3. Top Edge: Minimal Transparent Navigation Bar */}
      <HeaderNav
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        commStatus={commStatus}
        activeScenario={activeScenario}
        onSelectScenario={handleSelectScenario}
        onResetView={handleResetView}
        onOpenReport={() => setIsReportOpen(true)}
      />

      {/* 4. Center-Unobstructed HUD Layout */}

      {/* MODE 1: MISSION CONTROL */}
      {activeSection === 'overview' && (
        <MissionControlHUD
          telemetry={telemetryState}
          targetSystem={targetSystem}
          orbitalPhase={orbitalPhase}
          isInTransit={isInTransit}
          onInitiateScan={handleInitiateScan}
          onSimulateDisruption={handleSimulateDisruption}
          onOpenNetwork={() => setActiveSection('network')}
          onOpenExoplanetLab={() => setActiveSection('exoplanet')}
        />
      )}

      {/* MODE 2: ADAPTIVE NETWORK */}
      {activeSection === 'network' && (
        <AdaptiveNetworkHUD
          telemetry={telemetryState}
          nodes={nodes}
          links={links}
          asteroidClusters={asteroidClusters}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onSimulateDisruption={handleSimulateDisruption}
          onTriggerSecondDisruption={handleTriggerSecondDisruption}
          onRestoreCommunication={handleRestoreCommunication}
          onResetNetwork={handleResetNetwork}
        />
      )}

      {/* MODE 3: EXOPLANET LAB */}
      {activeSection === 'exoplanet' && (
        <ExoplanetLabHUD
          commStatus={commStatus}
          dataDelivered={dataDelivered}
          dataPacketProgress={packetProgress}
          orbitalPhase={orbitalPhase}
          isOrbitPlaying={isOrbitPlaying}
          onToggleOrbitPlay={() => setIsOrbitPlaying(p => !p)}
          onOrbitalPhaseChange={setOrbitalPhase}
          targetSystem={targetSystem}
          onSelectTargetSystem={setTargetSystem}
          candidateReport={candidateReport}
          onAnalysisSuccess={setCandidateReport}
        />
      )}

      {/* 5. Non-Intrusive Floating Mission Report Modal Dossier */}
      <MissionReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        telemetry={telemetryState}
        targetSystem={targetSystem}
        candidateReport={candidateReport}
      />
    </div>
  );
}
