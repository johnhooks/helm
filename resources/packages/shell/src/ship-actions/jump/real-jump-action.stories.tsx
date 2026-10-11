import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DraftAction, ShipAction } from '@helm/actions';
import { RealActionStory } from '../story-fixtures/action-store';

const draft: DraftAction<'jump'> = {
	type: 'jump',
	params: { from_node_id: 1, target_node_id: 7, route: [101, 102] },
};
const firstLeg = {
	core_cost: 4,
	core_before: 100,
	remaining_core_life: 96,
	completed_at: '2026-10-03T12:00:00Z',
};
const finalLeg = {
	core_cost: 4,
	core_before: 96,
	remaining_core_life: 92,
	completed_at: '2026-10-03T16:00:00Z',
};
const baseAction: ShipAction<'jump'> = {
	id: 201,
	ship_post_id: 42,
	type: 'jump',
	status: 'running',
	params: draft.params,
	result: null,
	deferred_until: new Date(Date.now() + 3600_000).toISOString(),
	created_at: '2026-10-03T12:00:00Z',
	updated_at: '2026-10-03T12:00:00Z',
};

const meta = {
	title: 'Ship Actions/Jump',
	parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Draft: Story = {
	render: () => <RealActionStory scenario={{ kind: 'jump', draft }} />,
};
export const Pending: Story = {
	render: () => (
		<RealActionStory
			scenario={{
				kind: 'jump',
				action: { ...baseAction, status: 'pending' },
			}}
		/>
	),
};
export const Running: Story = {
	render: () => (
		<RealActionStory
			scenario={{
				kind: 'jump',
				action: {
					...baseAction,
					result: {
						phases: [firstLeg],
						current_node_id: 2,
						remaining_core_life: 96,
						core_before: 100,
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
				kind: 'jump',
				action: {
					...baseAction,
					status: 'fulfilled',
					deferred_until: null,
					result: {
						phases: [firstLeg, finalLeg],
						current_node_id: 7,
						remaining_core_life: 92,
						core_before: 96,
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
				kind: 'jump',
				action: {
					...baseAction,
					status: 'partial',
					deferred_until: null,
					result: {
						phases: [firstLeg],
						current_node_id: 2,
						remaining_core_life: 96,
						core_before: 100,
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
				kind: 'jump',
				action: {
					...baseAction,
					status: 'failed',
					deferred_until: null,
					result: {
						phases: [firstLeg],
						current_node_id: 2,
						error: {
							code: 'helm.ship.insufficient_core',
							message: 'Core life too low for the next jump',
						},
					},
				},
			}}
		/>
	),
};
