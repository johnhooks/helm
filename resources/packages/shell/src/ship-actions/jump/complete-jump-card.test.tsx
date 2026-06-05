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
		from_node_id: 1,
		target_node_id: 7,
		route: [101],
	},
	result: null,
	deferred_until: null,
	created_at: '2026-02-16T12:00:00Z',
	updated_at: '2026-02-16T12:00:00Z',
};

describe('CompleteJumpCard', () => {
	it('renders fulfilled state with route progress', () => {
		const action: ShipAction<'jump'> = {
			...baseAction,
			status: 'fulfilled',
			result: {
				phases: [
					{
						core_cost: 12,
						core_before: 100,
						remaining_core_life: 88,
						completed_at: '2026-02-16T12:00:00Z',
					},
				],
				remaining_core_life: 88,
				core_before: 100,
			},
		};
		render(<CompleteJumpCard action={action} targetName={TARGET_NAME} />);
		expect(screen.getByText(/Tau Ceti/)).toBeInTheDocument();
		expect(screen.getByText('88')).toBeInTheDocument();
	});

	it('renders failed state with server error message', () => {
		const action: ShipAction<'jump'> = {
			...baseAction,
			status: 'failed',
			result: {
				error: {
					code: 'helm.ship.insufficient_core',
					message: 'Core life too low for this jump',
				},
			},
		};
		render(<CompleteJumpCard action={action} targetName={TARGET_NAME} />);
		expect(
			screen.getByText('Core life too low for this jump')
		).toBeInTheDocument();
	});

	it('renders failed state with unknown error when none provided', () => {
		const action: ShipAction<'jump'> = {
			...baseAction,
			status: 'failed',
			result: {},
		};
		render(<CompleteJumpCard action={action} targetName={TARGET_NAME} />);
		expect(screen.getByText('Unknown')).toBeInTheDocument();
	});
});
