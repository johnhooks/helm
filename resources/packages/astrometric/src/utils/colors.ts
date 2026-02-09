import { Color } from "three";
import type { SpectralClass } from "../types";

/**
 * LCARS color palette for Three.js
 * Colors derived from CSS tokens in `@helm/ui`
 */
export const lcarsColors = {
  bg: new Color("#0a0a0a"),
  surface: new Color("#141414"),
  surface2: new Color("#1b1b1b"),
  border: new Color("#2a2a2a"),
  text: new Color("#f0e6d2"),
  muted: new Color("#a39a88"),
  accent: new Color("#f2b654"),
  danger: new Color("#cc4444"),
  focus: new Color("#9cc7ff"),
  warning: new Color("#f2b654"),
  success: new Color("#8fbf4d"),
  info: new Color("#7fb2ff"),
  orange: new Color("#ff9900"),
  gold: new Color("#ffcc66"),
  peach: new Color("#ffcc99"),
  sunset: new Color("#ff9966"),
  blue: new Color("#99ccff"),
  sky: new Color("#6699cc"),
  ice: new Color("#ccddff"),
  lilac: new Color("#cc99cc"),
  violet: new Color("#9999cc"),
  plum: new Color("#664466"),
  hopbush: new Color("#c082a9"),
} as const;

/**
 * Star colors by spectral class
 * Based on real stellar classification colors
 */
export const spectralColors: Record<SpectralClass, string> = {
  O: "#9bb0ff", // Blue (hottest)
  B: "#aabfff", // Blue-white
  A: "#cad7ff", // White
  F: "#f8f7ff", // Yellow-white
  G: "#fff4ea", // Yellow (like our Sun)
  K: "#ffd2a1", // Orange
  M: "#ffcc6f", // Red (coolest)
};

/**
 * Get Three.js Color for a spectral class
 */
export function getSpectralColor(spectralClass: SpectralClass): Color {
  return new Color(spectralColors[spectralClass]);
}

/**
 * Default star color when spectral class is unknown
 */
export const defaultStarColor = new Color(spectralColors.G);

const SPECTRAL_CLASSES = new Set<string>(["O", "B", "A", "F", "G", "K", "M"]);

/**
 * Get color for a star system
 */
export function getStarSystemColor(spectralClass: string | null | undefined): Color {
  if (spectralClass && SPECTRAL_CLASSES.has(spectralClass)) {
    return getSpectralColor(spectralClass as SpectralClass);
  }
  return defaultStarColor.clone();
}

/**
 * Colors for route status - vibrant LCARS palette
 */
export const routeStatusColors: Record<string, Color> = {
  discovered: lcarsColors.blue.clone(),
  plotted: lcarsColors.orange.clone(),
  traveled: lcarsColors.gold.clone(),
  blocked: new Color("#ff6666"),
};

/**
 * Get color for a route based on status
 */
export function getRouteColor(status?: string, active?: boolean): Color {
  if (active) {
    return lcarsColors.orange.clone();
  }
  if (status && status in routeStatusColors) {
    return routeStatusColors[status].clone();
  }
  return lcarsColors.peach.clone();
}
