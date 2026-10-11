import { describe, expect, it } from 'vitest';
import { formatScanPower } from './format-power';
describe('scan power formatting', () => {
	it.each([
		[1, '1.0'],
		[1.3, '1.3'],
		[1.34, '1.34'],
		[1.68999, '1.69'],
	])('formats %s as %s', (value, expected) => {
		expect(formatScanPower(Number(value))).toBe(expected);
	});
});
