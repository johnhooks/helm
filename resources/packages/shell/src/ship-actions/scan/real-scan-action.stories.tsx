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
							discovery_chance: 0.24,
							maximum_discovery_chance: 0.38,
							next_cycle_cost: { core_life: 1 },
							spent: { core_life: 168 },
							budget: { core_life: 376 },
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
							discovery_chance: 0.001,
							maximum_discovery_chance: 0.6,
							next_cycle_cost: { core_life: 1 },
							spent: { core_life: 0 },
							budget: { core_life: 376 },
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
							discovery_chance: null,
							maximum_discovery_chance: 0.6,
							next_cycle_cost: { core_life: 0 },
							spent: { core_life: 10 },
							budget: { core_life: 10 },
							stop_reason: 'resource_budget_reached',
							stop_message:
								'Scanning stopped before exceeding its core budget.',
						},
					},
				},
			}}
		/>
	),
};
