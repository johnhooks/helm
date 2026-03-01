import { describe, it, expect } from 'vitest';
import {
	phaserDraw, phaserShieldDrain,
	torpedoHitChance, torpedoDamage,
	pdsInterception, ecmLockDegradation,
	shieldAbsorption,
} from './weapon';

describe('phaserDraw', () => {
	it('returns base draw when multiplier is 1.0', () => {
		expect(phaserDraw(0.35, 1.0)).toBe(0.35);
	});

	it('Striker hull reduces draw by 0.6×', () => {
		expect(phaserDraw(0.35, 0.6)).toBeCloseTo(0.21);
	});

	it('two phasers on Striker', () => {
		expect(phaserDraw(0.70, 0.6)).toBeCloseTo(0.42);
	});
});

describe('phaserShieldDrain', () => {
	it('base drain at priority 1.0', () => {
		expect(phaserShieldDrain(5.0, 1.0)).toBe(5.0);
	});

	it('double drain at priority 2.0', () => {
		expect(phaserShieldDrain(5.0, 2.0)).toBe(10.0);
	});
});

describe('torpedoHitChance', () => {
	it('full accuracy with no defenses', () => {
		expect(torpedoHitChance(0.7, 0, 0)).toBe(0.7);
	});

	it('ECM reduces accuracy', () => {
		expect(torpedoHitChance(0.7, 0.3, 0)).toBeCloseTo(0.49);
	});

	it('PDS reduces accuracy', () => {
		expect(torpedoHitChance(0.7, 0, 0.4)).toBeCloseTo(0.42);
	});

	it('both ECM and PDS stack multiplicatively', () => {
		const result = torpedoHitChance(0.7, 0.3, 0.4);
		// 0.7 * (1 - 0.3) * (1 - 0.4) = 0.7 * 0.7 * 0.6 = 0.294
		expect(result).toBeCloseTo(0.294);
	});

	it('clamps to 0-1 range', () => {
		expect(torpedoHitChance(1.5, 0, 0)).toBe(1.0);
		expect(torpedoHitChance(0.5, 0.9, 0.9)).toBeCloseTo(0.005);
	});
});

describe('torpedoDamage', () => {
	it('returns payload directly', () => {
		expect(torpedoDamage(50)).toBe(50);
	});
});

describe('pdsInterception', () => {
	it('full effectiveness against single torpedo', () => {
		expect(pdsInterception(0.6, 1)).toBe(0.6);
	});

	it('reduced effectiveness against multiple torpedoes', () => {
		const single = pdsInterception(0.6, 1);
		const quad = pdsInterception(0.6, 4);
		expect(quad).toBeLessThan(single);
		// 0.6 * (1/sqrt(4)) = 0.6 * 0.5 = 0.3
		expect(quad).toBeCloseTo(0.3);
	});

	it('returns 0 for zero torpedoes', () => {
		expect(pdsInterception(0.6, 0)).toBe(0);
	});

	it('clamps to 0-1', () => {
		expect(pdsInterception(1.5, 1)).toBe(1.0);
	});
});

describe('ecmLockDegradation', () => {
	it('returns strength directly', () => {
		expect(ecmLockDegradation(0.3)).toBe(0.3);
	});

	it('clamps to 0-1', () => {
		expect(ecmLockDegradation(1.5)).toBe(1.0);
		expect(ecmLockDegradation(-0.1)).toBe(0);
	});
});

describe('shieldAbsorption', () => {
	it('shield absorbs all damage when sufficient', () => {
		const result = shieldAbsorption(30, 100);
		expect(result.shieldDamage).toBe(30);
		expect(result.hullDamage).toBe(0);
	});

	it('overflow goes to hull', () => {
		const result = shieldAbsorption(150, 100);
		expect(result.shieldDamage).toBe(100);
		expect(result.hullDamage).toBe(50);
	});

	it('all damage to hull when shields are down', () => {
		const result = shieldAbsorption(50, 0);
		expect(result.shieldDamage).toBe(0);
		expect(result.hullDamage).toBe(50);
	});

	it('exact shield depletion', () => {
		const result = shieldAbsorption(100, 100);
		expect(result.shieldDamage).toBe(100);
		expect(result.hullDamage).toBe(0);
	});
});
