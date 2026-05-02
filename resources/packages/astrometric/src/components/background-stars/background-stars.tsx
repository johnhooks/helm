import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Points } from 'three';
import {
	BufferGeometry,
	Float32BufferAttribute,
	Color,
	MathUtils,
} from 'three';
import {
	DEFAULT_BACKGROUND_STAR_COUNT,
	BACKGROUND_STAR_DISTANCE_MAX,
	BACKGROUND_STAR_DISTANCE_MIN,
} from '../../constants';

export interface BackgroundStarsProps {
	/**
	 * Number of background stars
	 */
	count?: number;
	/**
	 * Whether to animate (slow twinkle)
	 */
	animate?: boolean;
	/**
	 * Thickness of the galactic disk (smaller = flatter)
	 */
	diskThickness?: number;
}

/**
 * Box-Muller transform for Gaussian random numbers
 */
function gaussianRandom(): number {
	const u1 = Math.random();
	const u2 = Math.random();
	return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Generate a position in a galactic disk distribution.
 * Stars concentrate near the galactic plane (Y=0).
 */
function randomGalacticPosition(
	minRadius: number,
	maxRadius: number,
	diskThickness: number
): { x: number; y: number; z: number } {
	// Radial distance - cubic root for uniform volume in disk
	const r = Math.cbrt(
		Math.random() * (maxRadius ** 3 - minRadius ** 3) + minRadius ** 3
	);

	// Angle around Y axis (full circle)
	const theta = Math.random() * Math.PI * 2;

	// Height above/below galactic plane - Gaussian distribution
	// Most stars near Y=0, fewer as you go up/down
	const y = gaussianRandom() * diskThickness;

	return {
		x: r * Math.cos(theta),
		y,
		z: r * Math.sin(theta),
	};
}

export function BackgroundStars({
	count = DEFAULT_BACKGROUND_STAR_COUNT,
	animate = true,
	diskThickness = 8,
}: BackgroundStarsProps) {
	const pointsRef = useRef<Points>(null);
	const { invalidate } = useThree();

	// Pre-compute twinkle offsets for animation
	const twinkleOffsets = useMemo(() => {
		return new Float32Array(count).map(() => Math.random() * Math.PI * 2);
	}, [count]);

	// Generate star geometry with positions and colors
	const geometry = useMemo(() => {
		const positions = new Float32Array(count * 3);
		const colors = new Float32Array(count * 3);
		const sizes = new Float32Array(count);

		const tempColor = new Color();

		for (let i = 0; i < count; i++) {
			const pos = randomGalacticPosition(
				BACKGROUND_STAR_DISTANCE_MIN,
				BACKGROUND_STAR_DISTANCE_MAX,
				diskThickness
			);

			positions[i * 3] = pos.x;
			positions[i * 3 + 1] = pos.y;
			positions[i * 3 + 2] = pos.z;

			// Star colors - warm whites and cool blues
			const hue =
				MathUtils.randFloat(0, 0.1) + (Math.random() > 0.5 ? 0.55 : 0);
			const saturation = MathUtils.randFloat(0, 0.3);
			const lightness = MathUtils.randFloat(0.4, 0.8);
			tempColor.setHSL(hue, saturation, lightness);

			// Random brightness variation (baked into color since points share opacity)
			// Most stars dim, occasional bright ones
			const brightness =
				Math.random() < 0.1
					? MathUtils.randFloat(0.7, 1.0) // 10% bright stars
					: MathUtils.randFloat(0.15, 0.5); // 90% dim stars

			colors[i * 3] = tempColor.r * brightness;
			colors[i * 3 + 1] = tempColor.g * brightness;
			colors[i * 3 + 2] = tempColor.b * brightness;

			// Random sizes - also vary more
			sizes[i] = MathUtils.randFloat(0.5, 2.5);
		}

		const geo = new BufferGeometry();
		geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
		geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
		geo.setAttribute('size', new Float32BufferAttribute(sizes, 1));

		return geo;
	}, [count, diskThickness]);

	// Base colors for restoring after twinkle
	const baseColors = useMemo(() => {
		const colors = geometry.getAttribute('color');
		return new Float32Array(colors.array as Float32Array);
	}, [geometry]);

	// Animate twinkle by modulating colors
	useFrame((state) => {
		if (!animate || !pointsRef.current) {
			return;
		}

		const time = state.clock.getElapsedTime();
		const colors = geometry.getAttribute('color');
		const colorArray = colors.array as Float32Array;

		// Update subset each frame for performance
		const updateCount = Math.ceil(count / 30);
		const startIndex = Math.floor(time * 20) % count;

		for (let i = 0; i < updateCount; i++) {
			const idx = (startIndex + i) % count;
			const twinkle =
				0.6 + 0.4 * Math.sin(time * 0.8 + twinkleOffsets[idx]);

			colorArray[idx * 3] = baseColors[idx * 3] * twinkle;
			colorArray[idx * 3 + 1] = baseColors[idx * 3 + 1] * twinkle;
			colorArray[idx * 3 + 2] = baseColors[idx * 3 + 2] * twinkle;
		}

		colors.needsUpdate = true;
		invalidate();
	});

	return (
		<points ref={pointsRef} geometry={geometry}>
			<pointsMaterial
				vertexColors
				size={1.5}
				sizeAttenuation={false}
				transparent
				opacity={0.4}
			/>
		</points>
	);
}
