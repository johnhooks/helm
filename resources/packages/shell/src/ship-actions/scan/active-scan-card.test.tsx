import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ShipAction } from '@helm/actions';
import { ActiveScanCard } from './active-scan-card';

const TARGET_NAME = 'Tau Ceti';

const baseAction: ShipAction<'scan_route'> = {
	id: 101,
	ship_post_id: 42,
	type: 'scan_route',
	status: 'running',
	params: {
		target_node_id: 7,
		source_node_id: 1,
		distance_ly: 11.9,
	},
	result: null,
	deferred_until: null,
	created_at: '2026-02-16T12:00:00Z',
	updated_at: '2026-02-16T12:00:00Z',
};

describe('ActiveScanCard', () => {
	it('renders with null result', () => {
		render(<ActiveScanCard action={baseAction} targetName={TARGET_NAME} />);
		expect(screen.getByText(/Tau Ceti/)).toBeInTheDocument();
	});

	it('renders waypoint count when result has nodes', () => {
		const action: ShipAction<'scan_route'> = {
			...baseAction,
			result: {
				from_node_id: 1,
				to_node_id: 7,
				skill: 50,
				efficiency: 60,
				duration: 3600,
				success: true,
				complete: false,
				nodes: [
					{ id: 1, type: 'system', x: 0, y: 0, z: 0 },
					{ id: 2, type: 'waypoint', x: 1, y: 1, z: 1 },
				],
				edges: [],
				discovered_edge_ids: [],
				discovered_node_ids: [1, 2],
				edges_discovered: 0,
				waypoints_created: 2,
				path: [1, 2],
			},
		};
		render(<ActiveScanCard action={action} targetName={TARGET_NAME} />);
		expect(screen.getByText('2')).toBeInTheDocument();
	});

	it('renders countdown when deferred_until is set', () => {
		const action: ShipAction<'scan_route'> = {
			...baseAction,
			deferred_until: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
		};
		render(<ActiveScanCard action={action} targetName={TARGET_NAME} />);
		expect(screen.getByText(/Remaining/)).toBeInTheDocument();
	});
});
