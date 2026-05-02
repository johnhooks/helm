import { Vector3 } from 'three';
import type { Position3D } from '../types';

/**
 * Convert Position3D to Three.js Vector3
 */
export function toVector3(position: Position3D): Vector3 {
	return new Vector3(position.x, position.y, position.z);
}

/**
 * Convert Three.js Vector3 to Position3D
 */
export function toPosition3D(vector: Vector3): Position3D {
	return {
		x: vector.x,
		y: vector.y,
		z: vector.z,
	};
}

/**
 * Calculate distance between two 3D positions
 */
export function distance3D(a: Position3D, b: Position3D): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const dz = b.z - a.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate distance from origin
 */
export function distanceFromOrigin(position: Position3D): number {
	return distance3D({ x: 0, y: 0, z: 0 }, position);
}

/**
 * Origin point (player location)
 */
export const ORIGIN: Position3D = { x: 0, y: 0, z: 0 };
export const ORIGIN_VECTOR = new Vector3(0, 0, 0);

/**
 * Generate random position within a spherical shell
 */
export function randomPositionInShell(
	minRadius: number,
	maxRadius: number
): Position3D {
	// Generate uniform distribution in spherical shell
	const u = Math.random();
	const v = Math.random();
	const theta = 2 * Math.PI * u;
	const phi = Math.acos(2 * v - 1);

	// Random radius between min and max (uniform volume distribution)
	const r = Math.cbrt(
		Math.random() * (maxRadius ** 3 - minRadius ** 3) + minRadius ** 3
	);

	return {
		x: r * Math.sin(phi) * Math.cos(theta),
		y: r * Math.sin(phi) * Math.sin(theta),
		z: r * Math.cos(phi),
	};
}

/**
 * Generate points along a circle on the XZ plane
 */
export function circlePointsXZ(
	radius: number,
	segments: number = 64
): Vector3[] {
	const points: Vector3[] = [];
	for (let i = 0; i <= segments; i++) {
		const theta = (i / segments) * Math.PI * 2;
		points.push(
			new Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius)
		);
	}
	return points;
}

/**
 * Midpoint between two positions
 */
export function midpoint(a: Position3D, b: Position3D): Position3D {
	return {
		x: (a.x + b.x) / 2,
		y: (a.y + b.y) / 2,
		z: (a.z + b.z) / 2,
	};
}

/**
 * Normalize a position to unit length
 */
export function normalize(position: Position3D): Position3D {
	const len = distanceFromOrigin(position);
	if (len === 0) {
		return { x: 0, y: 0, z: 0 };
	}
	return {
		x: position.x / len,
		y: position.y / len,
		z: position.z / len,
	};
}
