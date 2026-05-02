/**
 * Deterministic waypoint generator — TypeScript port of PHP NodeGenerator.
 *
 * All functions are pure — given the same inputs they always produce
 * the same output. Uses SHA256 (Node.js crypto) for determinism.
 */

import { createHash } from 'crypto';
import type { GraphNode } from './data/graph';
import { NAV_CONSTANTS } from '@helm/formulas';

export interface WaypointData {
	x: number;
	y: number;
	z: number;
	hash: string;
}

export function sha256(input: string): string {
	return createHash('sha256').update(input).digest('hex');
}

/**
 * Generate the corridor seed for two nodes.
 * Always uses min/max ordering so A→B and B→A produce same seed.
 */
export function corridorSeed(
	masterSeed: string,
	nodeAId: number,
	nodeBId: number
): string {
	const minId = Math.min(nodeAId, nodeBId);
	const maxId = Math.max(nodeAId, nodeBId);
	return sha256(
		`${masterSeed}:nav:${minId}-${maxId}:v${NAV_CONSTANTS.ALGORITHM_VERSION}`
	);
}

/**
 * Get a deterministic float from a seed.
 * Uses first 8 hex chars (32 bits) for the float.
 */
export function seededFloat(
	seed: string,
	key: string,
	min: number,
	max: number
): number {
	const hash = sha256(`${seed}:${key}`);
	const intValue = parseInt(hash.substring(0, 8), 16);
	const normalized = intValue / 0xffffffff;
	return min + normalized * (max - min);
}

/**
 * Generate the hash for a waypoint in a corridor.
 */
export function waypointHash(
	masterSeed: string,
	nodeAId: number,
	nodeBId: number,
	waypointIndex = 0
): string {
	const seed = corridorSeed(masterSeed, nodeAId, nodeBId);
	return sha256(`${seed}:wp:${waypointIndex}`);
}

/**
 * Compute the next waypoint between two nodes.
 * Deterministic — same from/to always produces same result.
 */
export function computeWaypoint(
	masterSeed: string,
	from: GraphNode,
	to: GraphNode
): WaypointData {
	const seed = corridorSeed(masterSeed, from.id, to.id);

	const progress = seededFloat(seed, 'progress', 0.3, 0.6);
	const scatterX = seededFloat(
		seed,
		'scatter_x',
		-NAV_CONSTANTS.MAX_SCATTER,
		NAV_CONSTANTS.MAX_SCATTER
	);
	const scatterY = seededFloat(
		seed,
		'scatter_y',
		-NAV_CONSTANTS.MAX_SCATTER,
		NAV_CONSTANTS.MAX_SCATTER
	);
	const scatterZ = seededFloat(
		seed,
		'scatter_z',
		-NAV_CONSTANTS.MAX_SCATTER,
		NAV_CONSTANTS.MAX_SCATTER
	);

	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const dz = to.z - from.z;
	const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

	const x = from.x + dx * progress + scatterX * distance;
	const y = from.y + dy * progress + scatterY * distance;
	const z = from.z + dz * progress + scatterZ * distance;

	const hash = waypointHash(masterSeed, from.id, to.id, 0);

	return { x, y, z, hash };
}

/**
 * Check if two nodes are close enough for a direct jump.
 * Deterministic — based on corridor seed.
 */
export function canDirectJump(
	masterSeed: string,
	from: GraphNode,
	to: GraphNode,
	maxRange: number = NAV_CONSTANTS.MAX_RANGE
): boolean {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const dz = to.z - from.z;
	const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

	if (distance > maxRange) {
		return false;
	}

	if (distance < 1.0) {
		return true;
	}

	const seed = corridorSeed(masterSeed, from.id, to.id);
	const threshold = seededFloat(seed, 'direct', 0.0, 1.0);

	const distanceRatio = distance / maxRange;
	const difficulty = Math.pow(distanceRatio, 1.5);

	return threshold > difficulty;
}

/**
 * Get the difficulty value for a node pair.
 * Deterministic per corridor — 0.0 to 1.0, higher = more difficult.
 */
export function corridorDifficulty(
	masterSeed: string,
	fromId: number,
	toId: number
): number {
	const seed = corridorSeed(masterSeed, fromId, toId);
	return seededFloat(seed, 'difficulty', 0.0, 1.0);
}
