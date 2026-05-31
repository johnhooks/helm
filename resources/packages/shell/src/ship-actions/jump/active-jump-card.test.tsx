import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ShipAction } from '@helm/actions';
import { ActiveJumpCard } from './active-jump-card';

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

describe('ActiveJumpCard', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-16T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders with null result', () => {
		render(<ActiveJumpCard action={baseAction} targetName={TARGET_NAME} />);
		expect(screen.getByText(/Tau Ceti/)).toBeInTheDocument();
	});

	it('renders route progress from phases', () => {
		const action: ShipAction<'jump'> = {
			...baseAction,
			params: { ...baseAction.params, route: [101, 102] },
			result: {
				phases: [
					{
						core_cost: 12,
						core_before: 100,
						remaining_core_life: 88,
						completed_at: '2026-02-16T12:00:00Z',
					},
				],
				current_node_id: 3,
			},
		};
		render(<ActiveJumpCard action={action} targetName={TARGET_NAME} />);
		expect(screen.getByText('2')).toBeInTheDocument();
		expect(screen.getByText('1')).toBeInTheDocument();
		expect(screen.getByText('3')).toBeInTheDocument();
	});

	it('renders countdown when deferred_until is set', () => {
		const action: ShipAction<'jump'> = {
			...baseAction,
			deferred_until: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
		};
		render(<ActiveJumpCard action={action} targetName={TARGET_NAME} />);
		expect(screen.getByText(/Remaining/)).toBeInTheDocument();
	});

	it('does not render a whole-route progress bar before route progress UI lands', () => {
		const action: ShipAction<'jump'> = {
			...baseAction,
			deferred_until: '2026-02-16T12:30:00Z',
		};
		render(<ActiveJumpCard action={action} targetName={TARGET_NAME} />);
		expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
	});
});
