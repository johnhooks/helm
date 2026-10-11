import { describe, expect, it } from 'vitest';
import { calculateSystemReadouts } from './system-readouts';

const stats = {
	engineering: {
		outputMult: 0.8,
		rechargeRate: 10,
		coreLife: 750,
		condition: 100,
	},
	navigation: { range: 7, speed: 24, draw: 1.5, condition: 100 },
	sensors: { range: 5, scanDuration: 1, discovery: 70, condition: 100 },
};
describe('effective ship system readouts', () => {
	it('accounts for the core and an underpowered drive', () => {
		const values = calculateSystemReadouts(stats, 'normal');
		expect(values.output).toBe(0.8);
		expect(values.driveRange).toBeCloseTo(7 * 0.8 * (0.8 / 1.5));
		expect(values.speed).toBeCloseTo(24 * 0.8 * (0.8 / 1.5));
		expect(values.sensorRange).toBe(4);
	});
	it('applies overdrive without exceeding the performance cap', () => {
		const values = calculateSystemReadouts(
			{ ...stats, engineering: { ...stats.engineering, outputMult: 2 } },
			'overdrive'
		);
		expect(values.driveRange).toBeCloseTo(7 * 2.6);
		expect(values.speed).toBeCloseTo(24 * 2.6);
		expect(values.sensorRange).toBe(13);
	});
});
