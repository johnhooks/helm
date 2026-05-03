import { describe, expect, it } from 'vitest';
import { getRouteColor, lcarsColors, routeStatusColors } from './colors';

describe('getRouteColor', () => {
	it('uses action overlay colors for scan and jump routes', () => {
		expect(getRouteColor('plotted', true, 'scan').getHexString()).toBe(
			lcarsColors.lilac.getHexString()
		);
		expect(getRouteColor('traveled', true, 'jump').getHexString()).toBe(
			lcarsColors.sky.getHexString()
		);
	});

	it('keeps failed overlays on the blocked route color', () => {
		expect(getRouteColor('blocked', true, 'jump').getHexString()).toBe(
			routeStatusColors.blocked.getHexString()
		);
	});

	it('uses status colors for canonical routes', () => {
		expect(getRouteColor('discovered').getHexString()).toBe(
			routeStatusColors.discovered.getHexString()
		);
		expect(getRouteColor('traveled').getHexString()).toBe(
			routeStatusColors.traveled.getHexString()
		);
	});
});
