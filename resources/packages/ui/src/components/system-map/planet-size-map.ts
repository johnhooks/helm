import type { PlanetType } from "../glyphs";

export type GlyphSize = "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

export const planetSizeMap: Record<PlanetType, GlyphSize> = {
	dwarf: "xxs",
	frozen: "xs",
	molten: "sm",
	terrestrial: "sm",
	desert: "sm",
	ocean: "md",
	toxic: "md",
	superEarth: "md",
	iceGiant: "lg",
	hotJupiter: "xl",
	gasGiant: "xxl",
};
