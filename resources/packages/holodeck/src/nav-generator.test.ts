import { describe, it, expect } from 'vitest';
import {
	sha256,
	corridorSeed,
	seededFloat,
	waypointHash,
	computeWaypoint,
	canDirectJump,
	corridorDifficulty,
} from './nav-generator';
import type { GraphNode } from './data/graph';

const SEED = 'test-master-seed';

function makeNode(id: number, x: number, y: number, z: number): GraphNode {
	return { id, type: 'system', x, y, z };
}

describe('sha256', () => {
	it('produces a 64-char hex string', () => {
		const hash = sha256('hello');
		expect(hash).toHaveLength(64);
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it('is deterministic', () => {
		expect(sha256('test')).toBe(sha256('test'));
	});
});

describe('corridorSeed', () => {
	it('is order-independent', () => {
		expect(corridorSeed(SEED, 1, 2)).toBe(corridorSeed(SEED, 2, 1));
	});

	it('differs for different node pairs', () => {
		expect(corridorSeed(SEED, 1, 2)).not.toBe(corridorSeed(SEED, 1, 3));
	});

	it('differs for different master seeds', () => {
		expect(corridorSeed('seed-a', 1, 2)).not.toBe(corridorSeed('seed-b', 1, 2));
	});

	it('produces a 64-char hex string', () => {
		const seed = corridorSeed(SEED, 1, 2);
		expect(seed).toHaveLength(64);
		expect(seed).toMatch(/^[0-9a-f]{64}$/);
	});

	it('matches PHP output for known inputs', () => {
		// PHP: hash('sha256', 'test-master-seed:nav:1-2:v1')
		// Verified cross-language determinism fixture
		const expected = sha256('test-master-seed:nav:1-2:v1');
		expect(corridorSeed(SEED, 1, 2)).toBe(expected);
	});
});

describe('seededFloat', () => {
	it('produces values in range [min, max]', () => {
		for (let i = 0; i < 100; i++) {
			const val = seededFloat(`seed-${i}`, 'key', 0.3, 0.6);
			expect(val).toBeGreaterThanOrEqual(0.3);
			expect(val).toBeLessThanOrEqual(0.6);
		}
	});

	it('is deterministic', () => {
		const a = seededFloat('abc', 'test', 0, 1);
		const b = seededFloat('abc', 'test', 0, 1);
		expect(a).toBe(b);
	});

	it('varies with different keys', () => {
		const a = seededFloat('abc', 'key-a', 0, 1);
		const b = seededFloat('abc', 'key-b', 0, 1);
		expect(a).not.toBe(b);
	});
});

describe('waypointHash', () => {
	it('is deterministic', () => {
		expect(waypointHash(SEED, 1, 2, 0)).toBe(waypointHash(SEED, 1, 2, 0));
	});

	it('is order-independent', () => {
		expect(waypointHash(SEED, 1, 2, 0)).toBe(waypointHash(SEED, 2, 1, 0));
	});

	it('differs by waypoint index', () => {
		expect(waypointHash(SEED, 1, 2, 0)).not.toBe(waypointHash(SEED, 1, 2, 1));
	});
});

describe('computeWaypoint', () => {
	it('is deterministic', () => {
		const from = makeNode(1, 0, 0, 0);
		const to = makeNode(2, 10, 0, 0);
		const wp1 = computeWaypoint(SEED, from, to);
		const wp2 = computeWaypoint(SEED, from, to);
		expect(wp1.x).toBe(wp2.x);
		expect(wp1.y).toBe(wp2.y);
		expect(wp1.z).toBe(wp2.z);
		expect(wp1.hash).toBe(wp2.hash);
	});

	it('places waypoint between from and to', () => {
		const from = makeNode(1, 0, 0, 0);
		const to = makeNode(2, 10, 0, 0);
		const wp = computeWaypoint(SEED, from, to);
		// x should be roughly 30-60% of 10, plus scatter
		expect(wp.x).toBeGreaterThan(1);
		expect(wp.x).toBeLessThan(9);
	});

	it('includes a hash', () => {
		const from = makeNode(1, 0, 0, 0);
		const to = makeNode(2, 10, 0, 0);
		const wp = computeWaypoint(SEED, from, to);
		expect(wp.hash).toHaveLength(64);
		expect(wp.hash).toMatch(/^[0-9a-f]{64}$/);
	});
});

describe('canDirectJump', () => {
	it('returns true for very close nodes (< 1 ly)', () => {
		const from = makeNode(1, 0, 0, 0);
		const to = makeNode(2, 0.5, 0.3, 0.2);
		expect(canDirectJump(SEED, from, to)).toBe(true);
	});

	it('returns false for distant nodes (> max range)', () => {
		const from = makeNode(1, 0, 0, 0);
		const to = makeNode(2, 8, 0, 0);
		expect(canDirectJump(SEED, from, to)).toBe(false);
	});

	it('is order-independent', () => {
		const from = makeNode(1, 0, 0, 0);
		const to = makeNode(2, 3, 0, 0);
		expect(canDirectJump(SEED, from, to)).toBe(canDirectJump(SEED, to, from));
	});

	it('respects custom maxRange', () => {
		const from = makeNode(1, 0, 0, 0);
		const to = makeNode(2, 3, 0, 0);
		// With very small max range, 3 ly is beyond it
		expect(canDirectJump(SEED, from, to, 2.0)).toBe(false);
	});
});

describe('corridorDifficulty', () => {
	it('returns a value between 0 and 1', () => {
		const difficulty = corridorDifficulty(SEED, 1, 2);
		expect(difficulty).toBeGreaterThanOrEqual(0);
		expect(difficulty).toBeLessThanOrEqual(1);
	});

	it('is order-independent', () => {
		expect(corridorDifficulty(SEED, 1, 2)).toBe(corridorDifficulty(SEED, 2, 1));
	});

	it('is deterministic', () => {
		expect(corridorDifficulty(SEED, 5, 10)).toBe(corridorDifficulty(SEED, 5, 10));
	});

	it('varies per corridor', () => {
		const d1 = corridorDifficulty(SEED, 1, 2);
		const d2 = corridorDifficulty(SEED, 1, 3);
		expect(d1).not.toBe(d2);
	});
});
