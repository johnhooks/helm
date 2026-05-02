import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ShipAction } from '@helm/actions';
import { CompleteJumpCard } from './complete-jump-card';

const TARGET_NAME = 'Tau Ceti';

const baseAction: ShipAction<'jump'> = {
	id: 201,
	ship_post_id: 42,
	type: 'jump',
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

describe('CompleteJumpCard', () => {
	it('renders fulfilled state with core cost', () => {
		const action: ShipAction<'jump'> = {
			...baseAction,
			status: 'fulfilled',
			result: {
				from_node_id: 1,
				to_node_id: 7,
				distance: 11.9,
				core_cost: 12,
				duration: 345600,
				remaining_core_life: 88,
				core_before: 100,
			},
		};
		render(<CompleteJumpCard action={action} targetName={TARGET_NAME} />);
		expect(screen.getByText(/Tau Ceti/)).toBeInTheDocument();
		expect(screen.getByText('12')).toBeInTheDocument();
	});

	it('renders failed state with cause', () => {
		const action: ShipAction<'jump'> = {
			...baseAction,
			status: 'failed',
			result: {
				from_node_id: 1,
				to_node_id: 7,
				distance: 11.9,
				core_cost: 12,
				duration: 345600,
				cause: 'Blackhole',
			},
		};
		render(<CompleteJumpCard action={action} targetName={TARGET_NAME} />);
		expect(screen.getByText('Blackhole')).toBeInTheDocument();
	});

	it('renders failed state with unknown cause when none provided', () => {
		const action: ShipAction<'jump'> = {
			...baseAction,
			status: 'failed',
			result: {
				from_node_id: 1,
				to_node_id: 7,
				distance: 11.9,
				core_cost: 0,
				duration: 0,
			},
		};
		render(<CompleteJumpCard action={action} targetName={TARGET_NAME} />);
		expect(screen.getByText('Unknown')).toBeInTheDocument();
	});
});
