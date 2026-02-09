import type { CSSProperties } from "react";
import type { StarNode } from "@helm/types";

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
 * Route status between systems
 */
export type RouteStatus = "discovered" | "plotted" | "traveled" | "blocked";

/**
 * A route connecting two star systems
 */
export interface Route {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Origin node ID
   */
  from: number;
  /**
   * Destination node ID
   */
  to: number;
  /**
   * Whether route is currently selected/active
   */
  active?: boolean;
  /**
   * Route discovery/travel status
   */
  status?: RouteStatus;
}

/**
 * Distance ring marker configuration
 */
export interface DistanceRing {
  /**
   * Distance from origin in light-years
   */
  distance: number;
  /**
   * Optional label (e.g., "2 ly")
   */
  label?: string;
  /**
   * Ring type: "major" for sensor/scan range, "minor" for reference markers
   */
  type?: "major" | "minor";
}

/**
 * Event fired when a star system is selected
 */
export interface StarSelectEvent {
  /**
   * Selected star data
   */
  star: StarNode;
  /**
   * Distance from player in light-years
   */
  distance: number;
}

/**
 * Event fired when a route is selected
 */
export interface RouteSelectEvent {
  /**
   * Selected route data
   */
  route: Route;
  /**
   * Origin star
   */
  from: StarNode;
  /**
   * Destination star
   */
  to: StarNode;
  /**
   * Route length in light-years
   */
  distance: number;
}

/**
 * Current hover state
 */
export interface HoverState {
  /**
   * Currently hovered star, if any
   */
  star: StarNode | null;
  /**
   * Currently hovered route, if any
   */
  route: Route | null;
}

/**
 * Camera position and orientation info
 */
export interface CameraInfo {
  /**
   * Distance from origin
   */
  distance: number;
  /**
   * Polar angle in radians
   */
  polarAngle: number;
  /**
   * Azimuthal angle in radians
   */
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
  /**
   * Stars to display
   */
  stars: StarNode[];
  /**
   * Routes between systems
   */
  routes?: Route[];
  /**
   * Distance ring markers
   */
  distanceRings?: DistanceRing[];
  /**
   * Number of background stars (galaxy context)
   */
  backgroundStarCount?: number;

  /**
   * Currently selected star ID
   */
  selectedStarId?: number | null;
  /**
   * Currently selected route ID
   */
  selectedRouteId?: string | null;

  /**
   * Node ID of the player's current location
   */
  currentNodeId?: number | null;
  /**
   * Set of node IDs the player has visited
   */
  visitedNodeIds?: Set<number>;
  /**
   * Set of node IDs within jump range
   */
  reachableNodeIds?: Set<number>;

  /**
   * Called when a star is selected (null = deselected)
   */
  onStarSelect?: (event: StarSelectEvent | null) => void;
  /**
   * Called when a route is selected (null = deselected)
   */
  onRouteSelect?: (event: RouteSelectEvent | null) => void;
  /**
   * Called when hover state changes
   */
  onHoverChange?: (state: HoverState) => void;
  /**
   * Called when camera moves
   */
  onCameraChange?: (info: CameraInfo) => void;

  /**
   * Show background galaxy stars
   */
  showBackground?: boolean;
  /**
   * Show distance labels on rings
   */
  showDistanceLabels?: boolean;
  /**
   * Enable orbit controls
   */
  enableControls?: boolean;
  /**
   * Initial camera distance from origin
   */
  initialCameraDistance?: number;
  /**
   * Minimum zoom distance
   */
  minDistance?: number;
  /**
   * Maximum zoom distance
   */
  maxDistance?: number;
  /**
   * Camera projection mode
   */
  cameraMode?: CameraMode;

  /**
   * Additional CSS class name
   */
  className?: string;
  /**
   * Inline styles
   */
  style?: CSSProperties;
  /**
   * Test ID for testing
   */
  "data-testid"?: string;
}
