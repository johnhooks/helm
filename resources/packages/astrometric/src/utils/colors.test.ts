import { describe, expect, it } from 'vitest';
import { getRouteEdgeColor, lcarsColors } from './colors';

describe('getRouteEdgeColor', () => {
	it('uses edge type colors for route, scan, and jump edges', () => {
		expect(getRouteEdgeColor('route', 'idle').getHexString()).toBe(
			lcarsColors.muted.getHexString()
		);
		expect(getRouteEdgeColor('scan', 'planned').getHexString()).toBe(
			lcarsColors.lilac.getHexString()
		);
		expect(getRouteEdgeColor('jump', 'active').getHexString()).toBe(
			lcarsColors.sky.getHexString()
		);
	});

	it('keeps complete edges in their type color family', () => {
		expect(getRouteEdgeColor('jump', 'complete').getHexString()).toBe(
			lcarsColors.sky.getHexString()
		);
		expect(getRouteEdgeColor('scan', 'complete').getHexString()).toBe(
			lcarsColors.lilac.getHexString()
		);
	});

	it('uses danger color for failed edges regardless of type', () => {
		expect(getRouteEdgeColor('jump', 'failed').getHexString()).toBe(
			lcarsColors.danger.getHexString()
		);
		expect(getRouteEdgeColor('scan', 'failed').getHexString()).toBe(
			lcarsColors.danger.getHexString()
		);
	});
});
