import { describe, expect, it } from 'vitest';
import type { ShipAction } from '@helm/actions';
import { getScanWaypointCount } from './utils';

const action: ShipAction<'scan_route'> = {
	id: 1,
	ship_post_id: 1,
	type: 'scan_route',
	status: 'running',
	params: {
		from_node_id: 1,
		source_node_id: 1,
		target_node_id: 9,
		distance_ly: 10,
	},
	result: null,
	deferred_until: null,
	created_at: '',
	updated_at: '',
};

describe('getScanWaypointCount', () => {
	it('excludes the target and origin from accumulated discoveries', () => {
		expect(
			getScanWaypointCount({
				...action,
				result: { discovered_node_ids: [1, 2, 3, 9] },
			})
		).toBe(2);
		expect(
			getScanWaypointCount({
				...action,
				result: { discovered_node_ids: [9] },
			})
		).toBe(0);
	});
	it('distinguishes unknown from empty discoveries', () => {
		expect(getScanWaypointCount(action)).toBeUndefined();
		expect(
			getScanWaypointCount({
				...action,
				result: { discovered_node_ids: [] },
			})
		).toBe(0);
	});
});
