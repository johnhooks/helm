import { describe, it, expect } from 'vitest';
import { createClock } from '../clock';

describe('Clock', () => {
	it('starts at 0 by default', () => {
		const clock = createClock();
		expect(clock.now()).toBe(0);
	});

	it('starts at a custom time', () => {
		const clock = createClock(1000);
		expect(clock.now()).toBe(1000);
	});

	it('advance moves forward and returns new time', () => {
		const clock = createClock();
		const t = clock.advance(60);
		expect(t).toBe(60);
		expect(clock.now()).toBe(60);
	});

	it('advance accumulates', () => {
		const clock = createClock(100);
		clock.advance(50);
		clock.advance(25);
		expect(clock.now()).toBe(175);
	});

	it('advanceTo sets exact time', () => {
		const clock = createClock();
		const t = clock.advanceTo(3600);
		expect(t).toBe(3600);
		expect(clock.now()).toBe(3600);
	});

	it('advanceTo can go backwards', () => {
		const clock = createClock(1000);
		clock.advanceTo(500);
		expect(clock.now()).toBe(500);
	});
});
