import { describe, it, expect } from 'vitest';
import { stellarNoise, noiseFloor } from './noise';

describe('stellarNoise', () => {
	it('returns 1.0 for a G-class star (reference level)', () => {
		expect(stellarNoise('G')).toBe(1.0);
	});

	it('is case-insensitive', () => {
		expect(stellarNoise('g')).toBe(1.0);
		expect(stellarNoise('o')).toBe(8.0);
	});

	it('ranks stellar classes in expected order', () => {
		const classes = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
		const levels = classes.map((c) => stellarNoise(c));

		// Each class should be louder than the next
		for (let i = 0; i < levels.length - 1; i++) {
			expect(levels[i]).toBeGreaterThan(levels[i + 1]);
		}
	});

	it('applies modifier', () => {
		// Binary system doubles the noise
		expect(stellarNoise('G', 2.0)).toBe(2.0);
		// Nebula dampening
		expect(stellarNoise('G', 0.5)).toBe(0.5);
	});

	it('defaults to G-class for unknown spectral types', () => {
		expect(stellarNoise('X')).toBe(1.0);
	});

	it('M-class is very quiet', () => {
		expect(stellarNoise('M')).toBe(0.3);
	});

	it('O-class is very loud', () => {
		expect(stellarNoise('O')).toBe(8.0);
	});
});

describe('noiseFloor', () => {
	it('returns baseline when no other sources', () => {
		expect(noiseFloor(1.0, [])).toBe(1.0);
	});

	it('combines ship emissions as attenuated RMS', () => {
		// G-class system with 3 miners (1.0 each): 0.3 × √(1²+1²+1²) = 0.3 × √3 ≈ 0.520
		expect(noiseFloor(1.0, [1.0, 1.0, 1.0])).toBeCloseTo(
			1.0 + 0.3 * Math.sqrt(3),
			5
		);
	});

	it('includes belt noise', () => {
		expect(noiseFloor(1.0, [], 2.5)).toBe(3.5);
	});

	it('includes ECM noise', () => {
		expect(noiseFloor(1.0, [], 0, 3.5)).toBe(4.5);
	});

	it('includes random noise (ion storm)', () => {
		expect(noiseFloor(1.0, [], 0, 0, 5.0)).toBe(6.0);
	});

	it('combines attenuated ship RMS with linear environmental sources', () => {
		// G-class star + 2 miners + belt + ECM + storm
		const total = noiseFloor(1.0, [1.0, 1.0], 2.0, 3.5, 4.0);
		// 1.0 + 0.3×√(1²+1²) + 2.0 + 3.5 + 4.0 = 1.0 + 0.3×√2 + 9.5
		expect(total).toBeCloseTo(1.0 + 0.3 * Math.sqrt(2) + 2.0 + 3.5 + 4.0);
	});

	it('busy system is noisier than quiet system', () => {
		const quiet = noiseFloor(1.0, []);
		const busy = noiseFloor(1.0, [1.0, 1.0, 1.0, 5.0, 2.0]);
		expect(busy).toBeGreaterThan(quiet);
	});

	it('scales sublinearly with ship count (attenuated RMS)', () => {
		// 100 identical miners: 0.3 × √100 = 3.0 ship noise
		const emissions = Array(100).fill(1.0) as number[];
		const floor = noiseFloor(1.0, emissions);
		// baseline(1) + 0.3×RMS(10) = 4.0, not 101
		expect(floor).toBeCloseTo(4.0);
	});

	it('single ship contributes attenuated emission', () => {
		// RMS of a single value = that value, attenuated by 0.3
		expect(noiseFloor(1.0, [3.0])).toBeCloseTo(1.9);
	});

	it('custom shipNoiseFactor overrides default', () => {
		// Factor 1.0 = no attenuation (old behavior)
		expect(noiseFloor(1.0, [3.0], 0, 0, 0, 1.0)).toBeCloseTo(4.0);
		// Factor 0.0 = ship noise completely ignored
		expect(noiseFloor(1.0, [3.0], 0, 0, 0, 0.0)).toBeCloseTo(1.0);
		// Factor 0.5 = half attenuation
		expect(noiseFloor(1.0, [3.0], 0, 0, 0, 0.5)).toBeCloseTo(2.5);
	});

	it('works with empty emissions array and all defaults', () => {
		expect(noiseFloor(0.3, [])).toBe(0.3);
	});
});
