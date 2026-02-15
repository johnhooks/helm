import type { CSSProperties } from "react";

export const PLANET_TYPES = [
	"terrestrial",
	"superEarth",
	"gasGiant",
	"iceGiant",
	"hotJupiter",
	"dwarf",
	"molten",
	"frozen",
	"ocean",
	"desert",
	"toxic",
] as const;

export type PlanetType = (typeof PLANET_TYPES)[number];

export interface PlanetGlyphProps {
	/**
	 * Planet classification
	 */
	type?: PlanetType;
	/**
	 * Whether the planet has rings
	 */
	ringed?: boolean;
	/**
	 * Size variant
	 */
	size?: "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
	/**
	 * Additional CSS class names
	 */
	className?: string;
	/**
	 * Inline styles
	 */
	style?: CSSProperties;
}

export function PlanetGlyph({
	type = "terrestrial",
	ringed = false,
	size = "md",
	className = "",
	style,
}: PlanetGlyphProps) {
	const classNames = [
		"helm-planet-glyph",
		`helm-planet-glyph--${type}`,
		`helm-planet-glyph--${size}`,
		ringed && "helm-planet-glyph--ringed",
		className,
	]
		.filter(Boolean)
		.join(" ");

	return <span className={classNames} style={style} aria-hidden="true" />;
}
