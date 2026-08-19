import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ShipAction } from '@helm/actions';
import { CompleteScanCard } from './complete-scan-card';

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

describe('CompleteScanCard', () => {
	it('renders fulfilled state with waypoint count', () => {
		const action: ShipAction<'scan_route'> = {
			...baseAction,
			status: 'fulfilled',
			result: {
				discovered_edge_ids: [1, 2],
				discovered_node_ids: [2, 7],
				path: [1, 2, 7],
				phases: [],
			},
		};
		render(<CompleteScanCard action={action} targetName={TARGET_NAME} />);
		expect(screen.getByText(/Tau Ceti/)).toBeInTheDocument();
		expect(screen.getByText('1')).toBeInTheDocument();
	});

	it('renders failed state with server error message', () => {
		const action: ShipAction<'scan_route'> = {
			...baseAction,
			status: 'failed',
			result: {
				error: {
					code: 'helm.action.failed',
					message: 'Signal lost',
				},
			},
		};
		render(<CompleteScanCard action={action} targetName={TARGET_NAME} />);
		expect(screen.getByText('Signal lost')).toBeInTheDocument();
	});

	it('renders failed state with unknown error when none provided', () => {
		const action: ShipAction<'scan_route'> = {
			...baseAction,
			status: 'failed',
			result: {},
		};
		render(<CompleteScanCard action={action} targetName={TARGET_NAME} />);
		expect(screen.getByText('Unknown')).toBeInTheDocument();
	});
});
