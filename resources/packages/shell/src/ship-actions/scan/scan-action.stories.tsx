import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DraftAction, ShipAction } from '@helm/actions';
import { ShipActionSlot } from '../ship-action-slot';
import { ScanActionFill } from './scan-action-fill';

const meta = {
	title: 'Ship Actions/Scan',
	parameters: {
		layout: 'centered',
		backgrounds: { default: 'dark' },
		docs: { disable: true },
	},
} satisfies Meta;

export default meta;
type Story = StoryObj< typeof meta >;

const baseAction: ShipAction = {
	id: 101,
	ship_post_id: 42,
	type: 'scan_route',
	status: 'pending',
	params: {
		target_name: 'Tau Ceti',
		source_name: 'Sol',
		distance_ly: 11.9,
		duration: '1h 12m',
		power_cost: 8,
		progress: 32,
		target_type: 'G8.5V',
	},
	result: null,
	deferred_until: new Date( Date.now() + 1000 * 60 * 60 ).toISOString(),
	created_at: new Date( Date.now() - 1000 * 60 * 10 ).toISOString(),
	updated_at: new Date().toISOString(),
};

const baseDraft: DraftAction = {
	type: 'scan_route',
	params: {
		target_name: 'Tau Ceti',
		source_name: 'Sol',
		distance_ly: 11.9,
		duration: '1h 12m',
		power_cost: 8,
		target_type: 'Main Sequence',
	},
};

function renderSlot( props: { action?: ShipAction; draft?: DraftAction } ) {
	const type = props.action?.type ?? props.draft?.type ?? 'scan_route';
	return (
		<>
			<ScanActionFill />
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
				result: { nodes: [ 1, 2, 3, 4, 5, 6 ], complete: true },
				deferred_until: null,
			},
		} ),
};

export const Partial: Story = {
	render: () =>
		renderSlot( {
			action: {
				...baseAction,
				status: 'partial',
				result: { nodes: [ 1, 2, 3 ], complete: false },
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
				result: null,
				deferred_until: null,
			},
		} ),
};
