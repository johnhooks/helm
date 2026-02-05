/**
 * Default values and constants for the astrometric visualization
 */

/** Default number of background stars for galaxy context */
export const DEFAULT_BACKGROUND_STAR_COUNT = 2000;

/** Default camera distance from origin */
export const DEFAULT_CAMERA_DISTANCE = 20;

/** Default minimum zoom distance */
export const DEFAULT_MIN_DISTANCE = 5;

/** Default maximum zoom distance */
export const DEFAULT_MAX_DISTANCE = 50;

/** Default cold-jump range boundary in light-years */
export const DEFAULT_JUMP_BOUNDARY = 7;

/** Default distance rings (in light-years) */
export const DEFAULT_DISTANCE_RINGS = [
  { distance: 2.5, label: "2.5 ly", type: "minor" as const },
  { distance: 5, label: "5 ly", type: "minor" as const },
  { distance: 7.5, label: "7.5 ly", type: "minor" as const },
  { distance: 10, label: "10 ly", type: "major" as const },
];

/** Polar angle limits for camera (prevent flipping) */
export const POLAR_ANGLE_MIN = Math.PI * 0.1;
export const POLAR_ANGLE_MAX = Math.PI * 0.9;

/** Base size for star rendering */
export const STAR_BASE_SIZE = 0.15;

/** Size multiplier for current system marker */
export const CURRENT_SYSTEM_SIZE_MULTIPLIER = 1.5;

/** Player marker size */
export const PLAYER_MARKER_SIZE = 0.2;

/** Background star size range */
export const BACKGROUND_STAR_SIZE_MIN = 0.02;
export const BACKGROUND_STAR_SIZE_MAX = 0.08;

/** Background star distance range */
export const BACKGROUND_STAR_DISTANCE_MIN = 40;
export const BACKGROUND_STAR_DISTANCE_MAX = 100;

/** Distance ring line width */
export const DISTANCE_RING_LINE_WIDTH = 3;

/** Route line width */
export const ROUTE_LINE_WIDTH = 2;

/** Active route line width */
export const ROUTE_LINE_WIDTH_ACTIVE = 4;

/** Orbit controls damping factor */
export const ORBIT_DAMPING_FACTOR = 0.05;
