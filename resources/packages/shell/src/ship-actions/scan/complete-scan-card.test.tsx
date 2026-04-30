import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ShipAction } from '@helm/actions';
import { CompleteScanCard } from './complete-scan-card';

const TARGET_NAME = 'Tau Ceti';

const baseAction: ShipAction< 'scan_route' > = {
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

describe( 'CompleteScanCard', () => {
	it( 'renders fulfilled state with waypoint count', () => {
		const action: ShipAction< 'scan_route' > = {
			...baseAction,
			status: 'fulfilled',
			result: {
				from_node_id: 1,
				to_node_id: 7,
				skill: 50,
				efficiency: 100,
				duration: 3600,
				success: true,
				complete: true,
				nodes: [ { id: 1, type: 'system', x: 0, y: 0, z: 0 }, { id: 2, type: 'waypoint', x: 1, y: 1, z: 1 }, { id: 3, type: 'system', x: 2, y: 2, z: 2 } ],
				edges: [ { id: 1, node_a_id: 1, node_b_id: 2 } ],
				discovered_edge_ids: [ 1 ],
				discovered_node_ids: [ 1, 2, 3 ],
				edges_discovered: 1,
				waypoints_created: 3,
				path: [ 1, 2, 3 ],
			},
		};
		render( <CompleteScanCard action={ action } targetName={ TARGET_NAME } /> );
		expect( screen.getByText( /Tau Ceti/ ) ).toBeInTheDocument();
		expect( screen.getByText( '3' ) ).toBeInTheDocument();
	} );

	it( 'renders failed state with cause', () => {
		const action: ShipAction< 'scan_route' > = {
			...baseAction,
			status: 'failed',
			result: {
				from_node_id: 1,
				to_node_id: 7,
				skill: 50,
				efficiency: 0,
				duration: 3600,
				cause: 'Signal lost',
			},
		};
		render( <CompleteScanCard action={ action } targetName={ TARGET_NAME } /> );
		expect( screen.getByText( 'Signal lost' ) ).toBeInTheDocument();
	} );

	it( 'renders failed state with unknown cause when none provided', () => {
		const action: ShipAction< 'scan_route' > = {
			...baseAction,
			status: 'failed',
			result: { from_node_id: 1, to_node_id: 7, skill: 0, efficiency: 0, duration: 0 },
		};
		render( <CompleteScanCard action={ action } targetName={ TARGET_NAME } /> );
		expect( screen.getByText( 'Unknown' ) ).toBeInTheDocument();
	} );
} );
