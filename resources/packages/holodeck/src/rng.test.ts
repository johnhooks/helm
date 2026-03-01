import { describe, it, expect } from 'vitest';
import { createRng } from './rng';

describe('Rng', () => {
	it('produces values in [0, 1)', () => {
		const rng = createRng(42);
		for (let i = 0; i < 100; i++) {
			const v = rng.next();
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});

	it('is deterministic for the same seed', () => {
		const a = createRng(123);
		const b = createRng(123);
		for (let i = 0; i < 50; i++) {
			expect(a.next()).toBe(b.next());
		}
	});

	it('produces different sequences for different seeds', () => {
		const a = createRng(1);
		const b = createRng(2);
		const seqA = Array.from({ length: 10 }, () => a.next());
		const seqB = Array.from({ length: 10 }, () => b.next());
		expect(seqA).not.toEqual(seqB);
	});

	it('nextInt returns integers in [0, max)', () => {
		const rng = createRng(99);
		for (let i = 0; i < 100; i++) {
			const v = rng.nextInt(10);
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(10);
			expect(Number.isInteger(v)).toBe(true);
		}
	});

	it('nextInt(1) always returns 0', () => {
		const rng = createRng(7);
		for (let i = 0; i < 20; i++) {
			expect(rng.nextInt(1)).toBe(0);
		}
	});
});
