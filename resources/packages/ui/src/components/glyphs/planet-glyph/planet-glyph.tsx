import type { CSSProperties } from "react";
import "./planet-glyph.css";

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
	"ringed",
] as const;

export type PlanetType = (typeof PLANET_TYPES)[number];

export interface PlanetGlyphProps {
	/**
	 * Planet classification
	 */
	type?: PlanetType;
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
	size = "md",
	className = "",
	style,
}: PlanetGlyphProps) {
	const classNames = [
		"helm-planet-glyph",
		`helm-planet-glyph--${type}`,
		`helm-planet-glyph--${size}`,
		className,
	]
		.filter(Boolean)
		.join(" ");

	return <span className={classNames} style={style} aria-hidden="true" />;
}
