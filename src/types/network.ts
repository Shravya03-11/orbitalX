export type NodeType = 'earth' | 'relay' | 'spacecraft' | 'target_system';

export type NodeStatus = 'online' | 'degraded' | 'offline';

export type LinkAvailability = 'available' | 'obstructed' | 'degraded' | 'severed';

export interface NetworkNode {
  id: string;
  name: string;
  type: NodeType;
  status: NodeStatus;
  position: [number, number, number]; // 3D coordinates in scene space
  realCoordinates: string; // Real-world astronomical positioning description
  subsystem: string;
  hardware: string;
  description: string;
}

export interface NetworkLink {
  id: string;
  source: string;
  target: string;
  latencyMs: number; // Base propagation delay
  quality: number; // 0.0 to 1.0 (signal-to-noise / packet success rate)
  availability: LinkAvailability;
  distanceAu: number; // Astronomical Units
  frequencyGhz: number; // e.g., Ka-band 32 GHz, Optical Laser 1550 nm
  interferenceFactor: number; // 0.0 = clean, 1.0 = total obstruction
  interruptedBy?: string; // Reason e.g. "Asteroid Swarm Belt-7A"
}

export interface RouteResult {
  path: string[]; // List of Node IDs in order from Earth to Target/Surveyor
  links: NetworkLink[];
  totalCost: number;
  totalLatencyMs: number;
  averageQuality: number;
  isDirect: boolean;
  hopCount: number;
  timestamp: number;
  computationTimeMs: number;
  algorithmNotes: string;
}

export type CommStatus = 'ONLINE' | 'REROUTING' | 'DEGRADED' | 'OFFLINE';

export type ScenarioType = 'scenario-1-normal' | 'scenario-2-direct-blocked' | 'scenario-3-disconnected';

export interface AsteroidCluster {
  id: string;
  name: string;
  position: [number, number, number];
  velocity: [number, number, number];
  radius: number;
  density: number;
  affectedLinkIds: string[];
  severity: 'partial' | 'severe' | 'total';
  active: boolean;
  type: 'asteroid_swarm' | 'comet_coma';
}

export interface TelemetryState {
  commStatus: CommStatus;
  activePath: string[];
  previousPath: string[] | null;
  routeResult: RouteResult | null;
  availableRelaysCount: number;
  totalRelaysCount: number;
  disruptedLinksCount: number;
  totalLinksCount: number;
  totalCost: number;
  estimatedLatencyMs: number;
  linkQuality: number;
  dataDeliveryStatus: 'STREAMING' | 'PAUSED' | 'RESTORED' | 'OFFLINE';
  dataPacketProgress: number; // 0 to 100%
  packetsDelivered: number;
  reroutingActive: boolean;
}

export interface ExoplanetTransitData {
  systemName: string;
  starType: string;
  starRadiusSolar: number;
  starTempKelvin: number;
  targetPlanetName: string;
  periodDays: number;
  depthPpm: number;
  durationHours: number;
  rawTimeHours: number[];
  rawRelativeFlux: number[];
  rawFluxErrors?: number[];
}

export interface TransitAnalysisResult {
  detectedPeriodDays: number;
  transitDepthFraction: number;
  transitDepthPpm: number;
  estimatedPlanetRadiusEarth: number;
  estimatedPlanetRadiusJupiter: number;
  semiMajorAxisAu: number;
  equilibriumTempKelvin: number;
  habitableZoneStatus: 'Conservative Habitable Zone' | 'Optimistic Habitable Zone' | 'Non-Habitable / Extreme Heat' | 'Non-Habitable / Glacial';
  signalToNoiseRatio: number;
  confidenceScore: number;
  timestamp: string;
}
