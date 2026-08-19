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
type Story = StoryObj<typeof meta>;

const baseAction: ShipAction<'scan_route'> = {
	id: 101,
	ship_post_id: 42,
	type: 'scan_route',
	status: 'pending',
	params: {
		target_node_id: 7,
		source_node_id: 1,
		from_node_id: 1,
		distance_ly: 11.9,
	},
	result: null,
	deferred_until: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
	created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
	updated_at: new Date().toISOString(),
};

const firstDiscovery = {
	from_node_id: 1,
	target_node_id: 7,
	discovered_node_id: 2,
	discovered_edge_id: 1,
};
const finalDiscovery = {
	from_node_id: 2,
	target_node_id: 7,
	discovered_node_id: 7,
	discovered_edge_id: 2,
};

const baseDraft: DraftAction<'scan_route'> = {
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

function Wrapper({ children }: { children: React.ReactNode }) {
	return (
		<div
			style={{
				width: 380,
				display: 'flex',
				flexDirection: 'column',
				gap: 6,
			}}
		>
			{children}
		</div>
	);
}

export const Draft: Story = {
	render: () => (
		<Wrapper>
			<DraftScanCard
				draft={baseDraft}
				targetName={TARGET_NAME}
				{...draftProps}
			/>
		</Wrapper>
	),
};

export const Running: Story = {
	render: () => (
		<Wrapper>
			<ActiveScanCard
				action={{
					...baseAction,
					status: 'running',
					result: {
						path: [1, 2],
						phases: [firstDiscovery],
						discovered_edge_ids: [1],
						discovered_node_ids: [2],
					},
				}}
				targetName={TARGET_NAME}
			/>
		</Wrapper>
	),
};

export const Fulfilled: Story = {
	render: () => (
		<Wrapper>
			<CompleteScanCard
				action={{
					...baseAction,
					status: 'fulfilled',
					result: {
						discovered_edge_ids: [1, 2],
						discovered_node_ids: [2, 7],
						path: [1, 2, 7],
						phases: [firstDiscovery, finalDiscovery],
					},
					deferred_until: null,
				}}
				targetName={TARGET_NAME}
			/>
		</Wrapper>
	),
};

export const Partial: Story = {
	render: () => (
		<Wrapper>
			<CompleteScanCard
				action={{
					...baseAction,
					status: 'partial',
					result: {
						discovered_edge_ids: [1],
						discovered_node_ids: [2],
						path: [1, 2],
						phases: [firstDiscovery],
					},
					deferred_until: null,
				}}
				targetName={TARGET_NAME}
			/>
		</Wrapper>
	),
};

export const Failed: Story = {
	render: () => (
		<Wrapper>
			<CompleteScanCard
				action={{
					...baseAction,
					status: 'failed',
					result: {
						error: {
							code: 'helm.action.failed',
							message: 'Signal lost',
							data: { status: 500 },
						},
					},
					deferred_until: null,
				}}
				targetName={TARGET_NAME}
			/>
		</Wrapper>
	),
};
