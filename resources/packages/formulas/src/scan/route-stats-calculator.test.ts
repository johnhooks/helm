import { describe, expect, it } from 'vitest';
import cases from '../../../../../tests/Fixtures/scan-estimates.json';
import { calculateRouteStats } from './route-stats-calculator';

describe('scan estimates shared with PHP', () => {
	it.each(cases)('$name', ({ input, expected }) => {
		const actual = calculateRouteStats(input);
		expect(actual.cycle_seconds).toBe(expected.cycle_seconds);
		expect(actual.estimated_peak_seconds).toBe(
			expected.estimated_peak_seconds
		);
		expect(actual.power_cost).toBeCloseTo(expected.power_cost, 10);
		expect(actual.work_chance).toBeCloseTo(expected.work_chance, 10);
	});
});
