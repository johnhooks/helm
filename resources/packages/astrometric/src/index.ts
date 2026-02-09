/**
 * Three.js star field visualization.
 *
 * @package
 */

// Main component
export { StarField } from "./components/star-field";

// Sub-components (for advanced usage)
export { CameraControls } from "./components/camera-controls";
export type { CameraControlsProps } from "./components/camera-controls";

export { BackgroundStars } from "./components/background-stars";
export type { BackgroundStarsProps } from "./components/background-stars";

export { GalacticPlane } from "./components/galactic-plane";
export type { GalacticPlaneProps } from "./components/galactic-plane";

export { LocalSystem } from "./components/local-system";
export type { LocalSystemProps } from "./components/local-system";

export { DistanceRings } from "./components/distance-rings";
export type { DistanceRingsProps } from "./components/distance-rings";

export { RouteLine } from "./components/route-line";
export type { RouteLineProps } from "./components/route-line";

// Hooks
export { useStarHover, useStarSelection } from "./hooks";
export type { UseStarHoverResult, UseStarSelectionResult } from "./hooks";

// Types
export type { StarNode } from "@helm/types";
export type {
  Position3D,
  SpectralClass,
  RouteStatus,
  Route,
  DistanceRing,
  StarSelectEvent,
  RouteSelectEvent,
  HoverState,
  CameraInfo,
  CameraMode,
  StarFieldProps,
} from "./types";

// Utilities
export {
  lcarsColors,
  spectralColors,
  getSpectralColor,
  getStarSystemColor,
  getRouteColor,
  toVector3,
  toPosition3D,
  distance3D,
  distanceFromOrigin,
  randomPositionInShell,
  circlePointsXZ,
  midpoint,
  normalize,
  ORIGIN,
  ORIGIN_VECTOR,
} from "./utils";

// Constants
export {
  DEFAULT_BACKGROUND_STAR_COUNT,
  DEFAULT_CAMERA_DISTANCE,
  DEFAULT_MIN_DISTANCE,
  DEFAULT_MAX_DISTANCE,
  DEFAULT_DISTANCE_RINGS,
  STAR_BASE_SIZE,
} from "./constants";
