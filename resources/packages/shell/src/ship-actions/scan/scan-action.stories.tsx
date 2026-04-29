import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DraftAction, ShipAction } from '@helm/actions';
import { DraftScanCard } from './draft-scan-card';
import { ActiveScanCard } from './active-scan-card';
import { CompleteScanCard } from './complete-scan-card';

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

const baseAction: ShipAction< 'scan_route' > = {
	id: 101,
	ship_post_id: 42,
	type: 'scan_route',
	status: 'pending',
	params: {
		target_node_id: 7,
		source_node_id: 1,
		distance_ly: 11.9,
	},
	result: null,
	deferred_until: new Date( Date.now() + 1000 * 60 * 60 ).toISOString(),
	created_at: new Date( Date.now() - 1000 * 60 * 10 ).toISOString(),
	updated_at: new Date().toISOString(),
};

const baseDraft: DraftAction< 'scan_route' > = {
	type: 'scan_route',
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
			<DraftScanCard draft={ baseDraft } targetName={ TARGET_NAME } { ...draftProps } />
		</Wrapper>
	),
};

export const Running: Story = {
	render: () => (
		<Wrapper>
			<ActiveScanCard
				action={ { ...baseAction, status: 'running', result: { from_node_id: 1, to_node_id: 7, skill: 50, efficiency: 32, duration: 3600 } } }
				targetName={ TARGET_NAME }
			/>
		</Wrapper>
	),
};

export const Fulfilled: Story = {
	render: () => (
		<Wrapper>
			<CompleteScanCard
				action={ {
					...baseAction,
					status: 'fulfilled',
					result: {
						from_node_id: 1,
						to_node_id: 7,
						skill: 50,
						efficiency: 100,
						duration: 3600,
						success: true,
						complete: true,
						nodes: [ { id: 1, x: 0, y: 0, z: 0 }, { id: 2, x: 1, y: 1, z: 1 }, { id: 3, x: 2, y: 2, z: 2 } ],
						edges: [ { id: 1, node_a_id: 1, node_b_id: 2 }, { id: 2, node_a_id: 2, node_b_id: 3 } ],
						discovered_edge_ids: [ 1, 2 ],
						discovered_node_ids: [ 1, 2, 3 ],
						edges_discovered: 2,
						waypoints_created: 3,
						path: [ 1, 2, 3 ],
					},
					deferred_until: null,
				} }
				targetName={ TARGET_NAME }
			/>
		</Wrapper>
	),
};

export const Partial: Story = {
	render: () => (
		<Wrapper>
			<CompleteScanCard
				action={ {
					...baseAction,
					status: 'partial',
					result: {
						from_node_id: 1,
						to_node_id: 7,
						skill: 50,
						efficiency: 60,
						duration: 3600,
						success: true,
						complete: false,
						nodes: [ { id: 1, x: 0, y: 0, z: 0 }, { id: 2, x: 1, y: 1, z: 1 } ],
						edges: [ { id: 1, node_a_id: 1, node_b_id: 2 } ],
						discovered_edge_ids: [ 1 ],
						discovered_node_ids: [ 1, 2 ],
						edges_discovered: 1,
						waypoints_created: 2,
						path: [ 1, 2 ],
					},
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
			<CompleteScanCard
				action={ {
					...baseAction,
					status: 'failed',
					result: { from_node_id: 1, to_node_id: 7, skill: 50, efficiency: 0, duration: 3600, cause: 'Signal lost' },
					deferred_until: null,
				} }
				targetName={ TARGET_NAME }
			/>
		</Wrapper>
	),
};
