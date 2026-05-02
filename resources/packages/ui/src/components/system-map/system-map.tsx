import type { CSSProperties } from 'react';
import { Fragment } from 'react';
import type { SystemPlanet } from '@helm/types';
import { PlanetGlyph, StarGlyph } from '../glyphs';
import type { PlanetType, SpectralClass, StellarType } from '../glyphs';
import { planetSizeMap } from './planet-size-map';
import type { GlyphSize } from './planet-size-map';
import './system-map.css';

export interface SystemMapProps {
	/**
	 * Planets in the system, ordered by orbit index
	 */
	planets: SystemPlanet[];
	/**
	 * Spectral class of the star (drives color)
	 */
	spectralClass?: SpectralClass;
	/**
	 * Stellar type — compact objects (neutron, pulsar, whiteDwarf) render as
	 * a small glyph instead of a cropped arc.
	 */
	stellarType?: StellarType;
	/**
	 * Star name label
	 */
	starName?: string;
	/**
	 * Called when a planet slot is clicked
	 */
	onPlanetSelect?: (planet: SystemPlanet) => void;
	/**
	 * Additional CSS class names
	 */
	className?: string;
	/**
	 * Inline styles
	 */
	style?: CSSProperties;
}

function isPlanetType(value: string | undefined): value is PlanetType {
	return value !== undefined && value in planetSizeMap;
}

const COMPACT_TYPES = new Set<string>([
	'neutron',
	'pulsar',
	'whiteDwarf',
	'brownDwarf',
]);

const spectralColor: Record<SpectralClass, string> = {
	O: '#9bb0ff',
	B: '#aabfff',
	A: '#cad7ff',
	F: '#f8f7ff',
	G: '#fff4ea',
	K: '#ffd2a1',
	M: '#ffcc6f',
};

/**
 * Primary star arc diameter — scales with the largest planet so bigger systems
 * get a gentler curve and smaller systems get a tighter one. Every value is much
 * larger than the glyph row so the star always reads as a massive cropped arc.
 */
const ARC_DIAMETER = [140, 180, 240, 320, 420, 540, 680];

/**
 * Pixel sizes for companion star circles.
 * Indices 0–6 match GlyphSize xxs–xxl; 7–8 extend the scale.
 */
const BODY_PX = [5, 8, 12, 18, 28, 40, 56, 68, 80];

const GLYPH_SIZES: GlyphSize[] = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

/**
 * Index of the largest scanned planet in the GLYPH_SIZES scale.
 */
function largestPlanetIndex(planets: SystemPlanet[]): number {
	let largest = 0;
	for (const p of planets) {
		if (p.scanned && isPlanetType(p.type)) {
			const idx = GLYPH_SIZES.indexOf(planetSizeMap[p.type]);
			if (idx > largest) {
				largest = idx;
			}
		}
	}
	return largest;
}

export function SystemMap({
	planets,
	spectralClass = 'G',
	stellarType = 'mainSequence',
	starName,
	onPlanetSelect,
	className = '',
	style,
}: SystemMapProps) {
	const sorted = [...planets].sort((a, b) => a.orbit_index - b.orbit_index);
	const isCompact = COMPACT_TYPES.has(stellarType);
	const planetIdx = largestPlanetIndex(planets);
	const arcDiam = ARC_DIAMETER[Math.min(planetIdx, ARC_DIAMETER.length - 1)];
	const companionPx = BODY_PX[Math.min(planetIdx + 1, BODY_PX.length - 1)];
	const color = spectralColor[spectralClass];

	return (
		<div className={`helm-system-map ${className}`.trim()} style={style}>
			{/* Primary star */}
			{isCompact ? (
				<div
					className="helm-system-map__glyph helm-system-map__glyph--star"
					style={{ gridRow: 1 }}
				>
					<StarGlyph
						spectralClass={spectralClass}
						stellarType={stellarType}
						size="sm"
					/>
				</div>
			) : (
				<div
					className="helm-system-map__star"
					style={
						{ gridRow: 1, '--star-color': color } as CSSProperties
					}
				>
					<span className="helm-system-map__star-clip">
						<span
							className="helm-system-map__star-circle"
							style={{
								width: arcDiam,
								height: arcDiam,
								background: color,
							}}
							aria-hidden="true"
						/>
					</span>
				</div>
			)}
			<span className="helm-system-map__label" style={{ gridRow: 2 }}>
				{starName ?? spectralClass}
			</span>

			{/* Bodies — planets and companion stars */}
			{sorted.map((planet) => {
				const scanned = planet.scanned;
				const isCompanion = planet.type === 'companion';

				if (isCompanion) {
					return (
						<Fragment key={planet.id}>
							<button
								type="button"
								className="helm-system-map__glyph helm-system-map__glyph--star"
								style={{ gridRow: 1 }}
								onClick={() => onPlanetSelect?.(planet)}
							>
								<span
									style={{
										display: 'block',
										width: companionPx,
										height: companionPx,
										borderRadius: '50%',
										background: color,
									}}
									aria-hidden="true"
								/>
							</button>
							<span
								className="helm-system-map__label"
								style={{ gridRow: 2 }}
							>
								{planet.name ?? 'Companion'}
							</span>
							<span
								className="helm-system-map__orbit"
								style={{ gridRow: 3 }}
							>
								{planet.orbit_au.toFixed(1)} AU
							</span>
						</Fragment>
					);
				}

				const glyphSize =
					scanned && isPlanetType(planet.type)
						? planetSizeMap[planet.type]
						: 'md';

				return (
					<Fragment key={planet.id}>
						<button
							type="button"
							className={`helm-system-map__glyph${
								!scanned
									? ' helm-system-map__glyph--unscanned'
									: ''
							}`}
							style={{ gridRow: 1 }}
							onClick={() => onPlanetSelect?.(planet)}
						>
							<PlanetGlyph
								type={
									scanned && isPlanetType(planet.type)
										? planet.type
										: 'terrestrial'
								}
								ringed={scanned ? planet.ringed : false}
								size={glyphSize}
							/>
						</button>
						<span
							className={`helm-system-map__label${
								!scanned ? ' helm-system-map__label--muted' : ''
							}`}
							style={{ gridRow: 2 }}
						>
							{scanned && planet.name ? planet.name : '???'}
						</span>
						<span
							className="helm-system-map__orbit"
							style={{ gridRow: 3 }}
						>
							{planet.orbit_au.toFixed(1)} AU
						</span>
					</Fragment>
				);
			})}
		</div>
	);
}
