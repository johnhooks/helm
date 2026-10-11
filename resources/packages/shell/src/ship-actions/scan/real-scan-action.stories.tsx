import { useState } from 'react';
import { SegmentedControl } from '@helm/ui';
import { ActiveScanCard } from './active-scan-card';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DraftAction, ShipAction } from '@helm/actions';
import { RealActionStory } from '../story-fixtures/action-store';

const draft: DraftAction<'scan_route'> = {
	type: 'scan_route',
	params: { source_node_id: 1, target_node_id: 7, distance_ly: 8 },
};

const firstDiscovery = {
	from_node_id: 1,
	target_node_id: 7,
	discovered_node_id: 2,
	discovered_edge_id: 101,
};
const finalDiscovery = {
	from_node_id: 2,
	target_node_id: 7,
	discovered_node_id: 7,
	discovered_edge_id: 102,
};

const baseAction: ShipAction<'scan_route'> = {
	id: 101,
	ship_post_id: 42,
	type: 'scan_route',
	status: 'running',
	params: { ...draft.params, from_node_id: 1 },
	result: null,
	deferred_until: new Date(Date.now() + 300_000).toISOString(),
	created_at: '2026-10-03T12:00:00Z',
	updated_at: '2026-10-03T12:00:00Z',
};

const meta = {
	title: 'Ship Actions/Scan',
	parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Draft: Story = {
	render: () => <RealActionStory scenario={{ kind: 'scan_route', draft }} />,
};
export const Pending: Story = {
	render: () => (
		<RealActionStory
			scenario={{
				kind: 'scan_route',
				action: { ...baseAction, status: 'pending' },
			}}
		/>
	),
};
export const Running: Story = {
	render: () => (
		<RealActionStory
			scenario={{
				kind: 'scan_route',
				action: {
					...baseAction,
					result: {
						path: [1, 2],
						phases: [firstDiscovery],
						discovered_edge_ids: [101],
						discovered_node_ids: [2],
						progress: {
							cycle_seconds: 420,
							completed_cycles: 168,
							cycle_number: 169,
							discovery_depth: 1,
							accumulated_work: 65,
							required_work: 72,
							work_progress: 0.9027777777777778,
							estimated_peak_seconds: 4200,
							discovery_chance: 0.24,
							maximum_discovery_chance: 0.38,
							next_cycle_cost: { power: 1 },
							spent: { power: 168 },
							stop_reason: null,
							stop_message: null,
						},
					},
				},
			}}
		/>
	),
};
export const FirstCycle: Story = {
	render: () => (
		<RealActionStory
			scenario={{
				kind: 'scan_route',
				action: {
					...baseAction,
					result: {
						path: [1],
						phases: [],
						discovered_edge_ids: [],
						discovered_node_ids: [],
						progress: {
							cycle_seconds: 420,
							completed_cycles: 0,
							cycle_number: 1,
							discovery_depth: 0,
							accumulated_work: 0,
							required_work: 72,
							work_progress: 0,
							estimated_peak_seconds: 37800,
							discovery_chance: 0.001,
							maximum_discovery_chance: 0.6,
							next_cycle_cost: { power: 1 },
							spent: { power: 0 },
							stop_reason: null,
							stop_message: null,
						},
					},
				},
			}}
		/>
	),
};
export const Fulfilled: Story = {
	render: () => (
		<RealActionStory
			scenario={{
				kind: 'scan_route',
				action: {
					...baseAction,
					status: 'fulfilled',
					deferred_until: null,
					result: {
						path: [1, 2, 7],
						phases: [firstDiscovery, finalDiscovery],
						discovered_edge_ids: [101, 102],
						discovered_node_ids: [2, 7],
					},
				},
			}}
		/>
	),
};
export const Partial: Story = {
	render: () => (
		<RealActionStory
			scenario={{
				kind: 'scan_route',
				action: {
					...baseAction,
					status: 'partial',
					deferred_until: null,
					result: {
						path: [1, 2],
						phases: [firstDiscovery],
						discovered_edge_ids: [101],
						discovered_node_ids: [2],
					},
				},
			}}
		/>
	),
};
export const Failed: Story = {
	render: () => (
		<RealActionStory
			scenario={{
				kind: 'scan_route',
				action: {
					...baseAction,
					status: 'failed',
					deferred_until: null,
					result: {
						error: {
							code: 'helm.action.failed',
							message: 'Scan interrupted',
						},
					},
				},
			}}
		/>
	),
};

export const StoppedWithoutDiscoveries: Story = {
	render: () => (
		<RealActionStory
			scenario={{
				kind: 'scan_route',
				action: {
					...baseAction,
					status: 'fulfilled',
					deferred_until: null,
					result: {
						path: [1],
						phases: [],
						discovered_edge_ids: [],
						discovered_node_ids: [],
						progress: {
							cycle_seconds: 420,
							completed_cycles: 10,
							cycle_number: 10,
							discovery_depth: 0,
							accumulated_work: 4,
							required_work: 72,
							work_progress: 0.05555555555555555,
							estimated_peak_seconds: null,
							discovery_chance: null,
							maximum_discovery_chance: 0.6,
							next_cycle_cost: { power: 0 },
							spent: { power: 10 },
							stop_reason: 'cycle_limit_reached',
							stop_message:
								'Scanning stopped at its cycle limit.',
						},
					},
				},
			}}
		/>
	),
};

function PowerModeExperiment() {
	const [powerMode, setPowerMode] = useState('normal');
	const action: ShipAction<'scan_route'> = {
		...baseAction,
		result: {
			progress: {
				cycle_seconds: 420,
				completed_cycles: 12,
				cycle_number: 13,
				discovery_depth: 0,
				accumulated_work: 6,
				required_work: 72,
				work_progress: 6 / 72,
				estimated_peak_seconds: 70980,
				discovery_chance: 0.001,
				maximum_discovery_chance: 0.6,
				next_cycle_cost: { power: 1 },
				spent: { power: 12 },
				stop_reason: null,
				stop_message: null,
				calculation_inputs: {
					navigation_efficiency: 0.5,
					base_sensor_range: 5,
					core_output: 1,
					sensor_quality: 0.8,
					work_gain: 0.5,
					remaining_distance: 3.6,
					required_work: 72,
					accumulated_work: 6,
					intensity: 'normal',
					power_mode: 'normal',
				},
			},
		},
	};
	return (
		<div style={{ width: 380, display: 'grid', gap: 16 }}>
			<SegmentedControl
				options={[
					{ value: 'efficiency', label: 'Efficiency' },
					{ value: 'normal', label: 'Normal' },
					{ value: 'overdrive', label: 'Overdrive' },
				]}
				value={powerMode}
				onChange={setPowerMode}
				aria-label="Power mode"
			/>
			<ActiveScanCard
				action={action}
				targetName="Tau Ceti"
				powerMode={powerMode}
			/>
		</div>
	);
}
export const PowerModePreview: Story = {
	render: () => <PowerModeExperiment />,
};
