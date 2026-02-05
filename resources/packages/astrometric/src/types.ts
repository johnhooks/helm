import type { CSSProperties } from "react";

/**
 * 3D position in light-years from origin
 */
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Spectral classification for stars
 * O = Blue (hottest), M = Red (coolest)
 */
export type SpectralClass = "O" | "B" | "A" | "F" | "G" | "K" | "M";

/**
 * A star system in the local neighborhood
 */
export interface StarSystem {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Position relative to player (light-years) */
  position: Position3D;
  /** Star spectral classification */
  spectralClass?: SpectralClass;
  /** Whether player has visited this system */
  visited?: boolean;
  /** Whether system is within jump range */
  reachable?: boolean;
  /** Player's current location */
  isCurrent?: boolean;
  /** Additional metadata */
  data?: Record<string, unknown>;
}

/**
 * Route status between systems
 */
export type RouteStatus = "discovered" | "plotted" | "traveled" | "blocked";

/**
 * A route connecting two star systems
 */
export interface Route {
  /** Unique identifier */
  id: string;
  /** Origin system ID */
  from: string;
  /** Destination system ID */
  to: string;
  /** Whether route is currently selected/active */
  active?: boolean;
  /** Route discovery/travel status */
  status?: RouteStatus;
}

/**
 * Distance ring marker configuration
 */
export interface DistanceRing {
  /** Distance from origin in light-years */
  distance: number;
  /** Optional label (e.g., "2 ly") */
  label?: string;
  /** Ring type: "major" for sensor/scan range, "minor" for reference markers */
  type?: "major" | "minor";
}

/**
 * Event fired when a star system is selected
 */
export interface StarSelectEvent {
  /** Selected system data */
  system: StarSystem;
  /** Distance from player in light-years */
  distance: number;
}

/**
 * Event fired when a route is selected
 */
export interface RouteSelectEvent {
  /** Selected route data */
  route: Route;
  /** Origin system */
  from: StarSystem;
  /** Destination system */
  to: StarSystem;
  /** Route length in light-years */
  distance: number;
}

/**
 * Current hover state
 */
export interface HoverState {
  /** Currently hovered system, if any */
  system: StarSystem | null;
  /** Currently hovered route, if any */
  route: Route | null;
}

/**
 * Camera position and orientation info
 */
export interface CameraInfo {
  /** Distance from origin */
  distance: number;
  /** Polar angle in radians */
  polarAngle: number;
  /** Azimuthal angle in radians */
  azimuthAngle: number;
}

/**
 * Camera projection mode
 * - perspective: Standard 3D view with depth (default)
 * - orthographic: Flat projection, no perspective distortion
 * - narrow: Reduced FOV perspective for less edge warping
 */
export type CameraMode = "perspective" | "orthographic" | "narrow";

/**
 * Props for the main StarField component
 */
export interface StarFieldProps {
  /** Star systems to display */
  systems: StarSystem[];
  /** Routes between systems */
  routes?: Route[];
  /** Distance ring markers */
  distanceRings?: DistanceRing[];
  /** Number of background stars (galaxy context) */
  backgroundStarCount?: number;

  /** Currently selected system ID */
  selectedSystemId?: string | null;
  /** Currently selected route ID */
  selectedRouteId?: string | null;

  /** Called when a system is selected (null = deselected) */
  onSystemSelect?: (event: StarSelectEvent | null) => void;
  /** Called when a route is selected (null = deselected) */
  onRouteSelect?: (event: RouteSelectEvent | null) => void;
  /** Called when hover state changes */
  onHoverChange?: (state: HoverState) => void;
  /** Called when camera moves */
  onCameraChange?: (info: CameraInfo) => void;

  /** Show background galaxy stars */
  showBackground?: boolean;
  /** Show distance labels on rings */
  showDistanceLabels?: boolean;
  /** Enable orbit controls */
  enableControls?: boolean;
  /** Initial camera distance from origin */
  initialCameraDistance?: number;
  /** Minimum zoom distance */
  minDistance?: number;
  /** Maximum zoom distance */
  maxDistance?: number;
  /** Camera projection mode */
  cameraMode?: CameraMode;

  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
  /** Test ID for testing */
  "data-testid"?: string;
}
