import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
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
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-16T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders with null result', () => {
		render(<ActiveScanCard action={baseAction} targetName={TARGET_NAME} />);
		expect(screen.getByText(/Tau Ceti/)).toBeInTheDocument();
	});

	it('renders waypoint count from public discoveries', () => {
		const action: ShipAction<'scan_route'> = {
			...baseAction,
			result: {
				discovered_edge_ids: [],
				discovered_node_ids: [1, 2],
				path: [1, 2],
				phases: [],
			},
		};
		render(<ActiveScanCard action={action} targetName={TARGET_NAME} />);
		expect(screen.getByText('1')).toBeInTheDocument();
	});

	it('updates the waypoint count from discoveries while still running', () => {
		const action: ShipAction<'scan_route'> = {
			...baseAction,
			result: {
				path: [1, 2],
				discovered_node_ids: [2],
				discovered_edge_ids: [10],
				phases: [],
			},
		};
		const { rerender } = render(
			<ActiveScanCard action={action} targetName={TARGET_NAME} />
		);
		expect(screen.getByText('1')).toBeInTheDocument();
		rerender(
			<ActiveScanCard
				action={{
					...action,
					result: { ...action.result, discovered_node_ids: [2, 3] },
				}}
				targetName={TARGET_NAME}
			/>
		);
		expect(screen.getByText('2')).toBeInTheDocument();
	});

	it('renders countdown when deferred_until is set', () => {
		const action: ShipAction<'scan_route'> = {
			...baseAction,
			deferred_until: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
		};
		render(<ActiveScanCard action={action} targetName={TARGET_NAME} />);
		expect(screen.getByText(/Next update/)).toBeInTheDocument();
	});

	it('does not imply total scan progress from a checkpoint', () => {
		const action: ShipAction<'scan_route'> = {
			...baseAction,
			deferred_until: '2026-02-16T12:30:00Z',
			result: {},
		};
		render(<ActiveScanCard action={action} targetName={TARGET_NAME} />);
		expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
	});
});
