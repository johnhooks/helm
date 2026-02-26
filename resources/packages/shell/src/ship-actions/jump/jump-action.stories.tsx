import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DraftAction, ShipAction } from '@helm/actions';
import { DraftJumpCard } from './draft-jump-card';
import { ActiveJumpCard } from './active-jump-card';
import { CompleteJumpCard } from './complete-jump-card';

const meta = {
	title: 'Ship Actions/Jump',
	parameters: {
		layout: 'centered',
		backgrounds: { default: 'dark' },
		docs: { disable: true },
	},
} satisfies Meta;

export default meta;
type Story = StoryObj< typeof meta >;

const baseAction: ShipAction< 'jump' > = {
	id: 201,
	ship_post_id: 42,
	type: 'jump',
	status: 'pending',
	params: {
		target_node_id: 7,
		source_node_id: 1,
		distance_ly: 11.9,
	},
	result: null,
	deferred_until: new Date( Date.now() + 1000 * 60 * 60 * 24 ).toISOString(),
	created_at: new Date( Date.now() - 1000 * 60 * 10 ).toISOString(),
	updated_at: new Date().toISOString(),
};

const baseDraft: DraftAction< 'jump' > = {
	type: 'jump',
	params: {
		target_node_id: 7,
		source_node_id: 1,
		distance_ly: 11.9,
	},
};

const TARGET_NAME = 'Tau Ceti';
const noop = () => {};
const draftProps = { onCancel: noop, onSubmit: noop, isSubmitting: false };

function Wrapper( { children }: { children: React.ReactNode } ) {
	return (
		<div style={ { width: 380, display: 'flex', flexDirection: 'column', gap: 6 } }>
			{ children }
		</div>
	);
}

export const Draft: Story = {
	render: () => (
		<Wrapper>
			<DraftJumpCard draft={ baseDraft } targetName={ TARGET_NAME } { ...draftProps } />
		</Wrapper>
	),
};

export const Running: Story = {
	render: () => (
		<Wrapper>
			<ActiveJumpCard
				action={ { ...baseAction, status: 'running', result: { from_node_id: 1, to_node_id: 7, distance: 11.9, core_cost: 12, duration: 345600 } } }
				targetName={ TARGET_NAME }
			/>
		</Wrapper>
	),
};

export const Fulfilled: Story = {
	render: () => (
		<Wrapper>
			<CompleteJumpCard
				action={ {
					...baseAction,
					status: 'fulfilled',
					result: { from_node_id: 1, to_node_id: 7, distance: 11.9, core_cost: 12, duration: 345600, remaining_core_life: 88, core_before: 100 },
					deferred_until: null,
				} }
				targetName={ TARGET_NAME }
			/>
		</Wrapper>
	),
};

export const Failed: Story = {
	render: () => (
		<Wrapper>
			<CompleteJumpCard
				action={ {
					...baseAction,
					status: 'failed',
					result: { from_node_id: 1, to_node_id: 7, distance: 11.9, core_cost: 12, duration: 345600, cause: 'Blackhole' },
					deferred_until: null,
				} }
				targetName={ TARGET_NAME }
			/>
		</Wrapper>
	),
};
