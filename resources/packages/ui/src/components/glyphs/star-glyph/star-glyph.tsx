import type { CSSProperties } from "react";
import "./star-glyph.css";

export const SPECTRAL_CLASSES = ["O", "B", "A", "F", "G", "K", "M"] as const;

export const STELLAR_TYPES = [
	"mainSequence",
	"giant",
	"whiteDwarf",
	"neutron",
	"pulsar",
	"brownDwarf",
] as const;

export type SpectralClass = (typeof SPECTRAL_CLASSES)[number];
export type StellarType = (typeof STELLAR_TYPES)[number];

export interface StarGlyphProps {
	/** Spectral class (O=hottest blue, M=coolest red) */
	spectralClass?: SpectralClass;
	/** Stellar type for exotic stars */
	stellarType?: StellarType;
	/** Size variant */
	size?: "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
	/** Additional CSS class names */
	className?: string;
	/** Inline styles */
	style?: CSSProperties;
}

export function StarGlyph({
	spectralClass = "G",
	stellarType = "mainSequence",
	size = "md",
	className = "",
	style,
}: StarGlyphProps) {
	const classNames = [
		"helm-star-glyph",
		`helm-star-glyph--${spectralClass}`,
		`helm-star-glyph--${stellarType}`,
		`helm-star-glyph--${size}`,
		className,
	]
		.filter(Boolean)
		.join(" ");

	return <span className={classNames} style={style} aria-hidden="true" />;
}
