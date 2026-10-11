import estimateCases from '../../../../../../tests/Fixtures/scan-estimates.json';
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
			accumulated_work: 36,
			required_work: 72,
			work_progress: 0.5,
			estimated_peak_seconds: 4200,
			discovery_chance: 1e-20,
			maximum_discovery_chance: 0.59,
			next_cycle_cost: { power: 1 },
			spent: { power: 5 },
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
		expect(screen.getByText('CYC')).toBeVisible();
		expect(screen.getByText('6')).toBeVisible();
		expect(screen.getByText('Chance')).toBeVisible();
		expect(screen.getByText('50.0%')).toBeVisible();
		expect(screen.getByText('~1.2')).toBeVisible();
		expect(screen.getByText('PWR/CYC')).toBeVisible();
		expect(
			screen.getByRole('progressbar', {
				name: 'Work toward peak scan effectiveness',
			})
		).toHaveAttribute('aria-valuenow', '50');
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

	it('advances only the cycle locally, holds at full, then resets at the next checkpoint', () => {
		const action: ShipAction<'scan_route'> = {
			...baseAction,
			deferred_until: new Date(Date.now() + 210000).toISOString(),
			result: {
				progress: {
					cycle_seconds: 420,
					completed_cycles: 1,
					cycle_number: 2,
					discovery_depth: 0,
					accumulated_work: 36,
					required_work: 72,
					work_progress: 0.5,
					estimated_peak_seconds: 4200,
					discovery_chance: 0.001,
					maximum_discovery_chance: 0.6,
					next_cycle_cost: { power: 1 },
					spent: { power: 1 },
					stop_reason: null,
					stop_message: null,
				},
			},
		};
		const { rerender } = render(
			<ActiveScanCard action={action} targetName={TARGET_NAME} />
		);
		const cycle = () =>
			screen.getByRole('progressbar', { name: 'Current scan cycle' });
		expect(cycle()).toHaveAttribute('aria-valuenow', '50');
		act(() => vi.advanceTimersByTime(220000));
		expect(cycle()).toHaveAttribute('aria-valuenow', '100');
		expect(
			screen.getByRole('progressbar', {
				name: 'Work toward peak scan effectiveness',
			})
		).toHaveAttribute('aria-valuenow', '50');
		rerender(
			<ActiveScanCard
				action={{
					...action,
					deferred_until: new Date(Date.now() + 420000).toISOString(),
				}}
				targetName={TARGET_NAME}
			/>
		);
		expect(cycle()).toHaveAttribute('aria-valuenow', '0');
	});

	it('recalculates estimates when power mode changes without changing the current checkpoint', () => {
		const action: ShipAction<'scan_route'> = {
			...baseAction,
			deferred_until: new Date(Date.now() + 420000).toISOString(),
			result: {
				progress: {
					cycle_seconds: 420,
					completed_cycles: 0,
					cycle_number: 1,
					discovery_depth: 0,
					accumulated_work: 6,
					required_work: 72,
					work_progress: 6 / 72,
					estimated_peak_seconds: 0,
					discovery_chance: 0.001,
					maximum_discovery_chance: 0.6,
					next_cycle_cost: { power: 1 },
					spent: { power: 0 },
					stop_reason: null,
					stop_message: null,
					calculation_inputs: estimateCases[4].input,
				},
			},
		};
		const { rerender } = render(
			<ActiveScanCard
				action={action}
				targetName={TARGET_NAME}
				powerMode="normal"
			/>
		);
		expect(screen.getByText('1.0')).toBeVisible();
		const normal =
			'~' +
			(estimateCases[4].expected.estimated_peak_seconds / 3600).toFixed(
				1
			);
		expect(screen.getByText(normal)).toBeVisible();
		rerender(
			<ActiveScanCard
				action={action}
				targetName={TARGET_NAME}
				powerMode="overdrive"
			/>
		);
		expect(screen.getByText('1.69')).toBeVisible();
		const overdrive =
			'~' +
			(estimateCases[7].expected.estimated_peak_seconds / 3600).toFixed(
				1
			);
		expect(screen.getByText(overdrive)).toBeVisible();
		expect(
			screen.getByText('Power mode change applies next cycle.')
		).toBeVisible();
		expect(screen.getByRole('timer')).toHaveTextContent('7m');
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
