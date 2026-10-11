import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
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

	it('shows the cycle and discovery probability instead of waypoint count', () => {
		const progress = {
			cycle_seconds: 420,
			completed_cycles: 5,
			cycle_number: 6,
			discovery_depth: 0,
			accumulated_work: 1.5,
			discovery_chance: 1e-20,
			maximum_discovery_chance: 0.59,
			next_cycle_cost: { core_life: 1 },
			spent: { core_life: 5 },
			budget: { core_life: 376 },
			stop_reason: null,
			stop_message: null,
		};
		const action: ShipAction<'scan_route'> = {
			...baseAction,
			result: { progress },
		};
		const { container, rerender } = render(
			<ActiveScanCard action={action} targetName={TARGET_NAME} />
		);
		expect(screen.getByText('Cycle')).toBeVisible();
		expect(screen.getByText('6')).toBeVisible();
		expect(screen.getByText('Chance')).toBeVisible();
		expect(screen.getByText('0.0%')).toBeVisible();
		expect(screen.queryByText('Waypoints')).not.toBeInTheDocument();
		rerender(
			<ActiveScanCard
				action={{
					...action,
					result: {
						progress: {
							...progress,
							cycle_number: 100,
							discovery_chance: 0.24,
						},
					},
				}}
				targetName={TARGET_NAME}
			/>
		);
		expect(screen.getByText('100')).toBeVisible();
		expect(screen.getByText('24.0%')).toBeVisible();
		expect(
			container.querySelector('.helm-arc-indicator')
		).not.toBeInTheDocument();
	});

	it('renders countdown when deferred_until is set', () => {
		const action: ShipAction<'scan_route'> = {
			...baseAction,
			deferred_until: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
		};
		render(<ActiveScanCard action={action} targetName={TARGET_NAME} />);
		expect(screen.getByText(/Next update/)).toBeInTheDocument();
	});

	it('holds at zero until a new checkpoint arrives', () => {
		const action: ShipAction<'scan_route'> = {
			...baseAction,
			deferred_until: new Date(Date.now() + 1000).toISOString(),
		};
		const { rerender } = render(
			<ActiveScanCard action={action} targetName={TARGET_NAME} />
		);
		act(() => vi.advanceTimersByTime(2000));
		expect(screen.getByRole('timer')).toHaveTextContent('00:00');
		expect(screen.getByRole('timer')).toHaveClass('helm-countdown--active');
		rerender(
			<ActiveScanCard
				action={{
					...action,
					deferred_until: new Date(
						Date.now() + 420_000
					).toISOString(),
				}}
				targetName={TARGET_NAME}
			/>
		);
		expect(screen.getByRole('timer')).toHaveTextContent('7m');
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
