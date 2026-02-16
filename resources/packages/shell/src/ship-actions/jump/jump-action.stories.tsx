import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DraftAction, ShipAction } from '@helm/actions';
import { ShipActionSlot } from '../ship-action-slot';
import { JumpActionFill } from './jump-action-fill';

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

const baseAction: ShipAction = {
	id: 201,
	ship_post_id: 42,
	type: 'jump',
	status: 'pending',
	params: {
		target_name: 'Tau Ceti',
		distance_ly: 11.9,
		duration: '4d 2h',
		speed_ly_per_day: 3.2,
		power_cost: 12,
		progress: 18,
	},
	result: null,
	deferred_until: new Date( Date.now() + 1000 * 60 * 60 * 24 ).toISOString(),
	created_at: new Date( Date.now() - 1000 * 60 * 10 ).toISOString(),
	updated_at: new Date().toISOString(),
};

const baseDraft: DraftAction = {
	type: 'jump',
	params: {
		target_name: 'Tau Ceti',
		distance_ly: 11.9,
		duration: '4d 2h',
		speed_ly_per_day: 3.2,
		power_cost: 12,
	},
};

function renderSlot( props: { action?: ShipAction; draft?: DraftAction } ) {
	const type = props.action?.type ?? props.draft?.type ?? 'jump';
	return (
		<>
			<JumpActionFill />
			<div style={ { width: 380, display: 'flex', flexDirection: 'column', gap: 6 } }>
				<ShipActionSlot
					type={ type }
					action={ props.action }
					draft={ props.draft }
				/>
			</div>
		</>
	);
}

export const Draft: Story = {
	render: () => renderSlot( { draft: baseDraft } ),
};

export const Running: Story = {
	render: () => renderSlot( { action: { ...baseAction, status: 'running' } } ),
};

export const Fulfilled: Story = {
	render: () =>
		renderSlot( {
			action: {
				...baseAction,
				status: 'fulfilled',
				result: {},
				deferred_until: null,
			},
		} ),
};

export const Failed: Story = {
	render: () =>
		renderSlot( {
			action: {
				...baseAction,
				status: 'failed',
				result: { cause: 'Blackhole' },
				deferred_until: null,
			},
		} ),
};
