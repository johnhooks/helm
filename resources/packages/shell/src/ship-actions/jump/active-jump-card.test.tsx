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
		target_node_id: 7,
		source_node_id: 1,
		distance_ly: 11.9,
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

	it('renders duration and core cost from result', () => {
		const action: ShipAction<'jump'> = {
			...baseAction,
			result: {
				from_node_id: 1,
				to_node_id: 7,
				distance: 11.9,
				core_cost: 12,
				duration: 345600,
			},
		};
		render(<ActiveJumpCard action={action} targetName={TARGET_NAME} />);
		expect(screen.getByText('345600')).toBeInTheDocument();
		expect(screen.getByText('12')).toBeInTheDocument();
	});

	it('renders countdown when deferred_until is set', () => {
		const action: ShipAction<'jump'> = {
			...baseAction,
			deferred_until: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
		};
		render(<ActiveJumpCard action={action} targetName={TARGET_NAME} />);
		expect(screen.getByText(/Remaining/)).toBeInTheDocument();
	});

	it('calculates progress from duration and deferred_until', () => {
		const action: ShipAction<'jump'> = {
			...baseAction,
			deferred_until: '2026-02-16T12:30:00Z',
			result: {
				from_node_id: 1,
				to_node_id: 7,
				distance: 11.9,
				core_cost: 12,
				duration: 3600,
			},
		};
		render(<ActiveJumpCard action={action} targetName={TARGET_NAME} />);
		expect(screen.getByRole('progressbar')).toHaveAttribute(
			'aria-valuenow',
			'50'
		);
	});
});
