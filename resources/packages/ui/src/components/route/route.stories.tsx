import type { Meta, StoryObj } from '@storybook/react-vite';
import { Panel } from '../panel';
import { Readout } from '../readout';
import { StatusBadge } from '../status-badge';
import { TitleBar } from '../title-bar';
import { Route } from './route';
import type { RouteLeg, RouteNode } from './route';

const meta = {
	title: 'Display/Route',
	component: Route,
	parameters: {
		layout: 'centered',
		backgrounds: { default: 'dark' },
	},
	argTypes: {
		tone: {
			control: 'select',
			options: ['sky', 'lilac', 'gold', 'accent', 'danger', 'success'],
		},
		size: {
			control: 'inline-radio',
			options: ['sm', 'md'],
		},
		state: {
			control: 'select',
			options: ['planned', 'active', 'completed', 'partial', 'failed'],
		},
		layout: {
			control: 'inline-radio',
			options: ['even', 'distance'],
		},
	},
	decorators: [
		(Story) => (
			<div style={{ width: 520, padding: '40px 12px 12px' }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Route>;

export default meta;
type Story = StoryObj<typeof meta>;

const nodes: RouteNode[] = [
	{
		id: 'sol',
		label: 'Sol',
		spectralClass: 'G',
		state: 'complete',
	},
	{
		id: 'barnard-waypoint',
		label: 'Barnard Waypoint',
		kind: 'waypoint',
		state: 'complete',
	},
	{
		id: 'tau-ceti',
		label: 'Tau Ceti',
		spectralClass: 'G',
		state: 'complete',
		destination: true,
	},
];

const legs: RouteLeg[] = [
	{
		id: 'sol-waypoint',
		details: ['1d 8h'],
		state: 'complete',
		distanceLy: 1.4,
	},
	{
		id: 'waypoint-tau',
		details: ['2d 3h'],
		state: 'complete',
		distanceLy: 6.2,
	},
];

export const CompletedRoute: Story = {
	args: {
		nodes,
		legs,
		state: 'completed',
		tone: 'sky',
		size: 'md',
		label: 'Completed jump route',
	},
};

export const DistanceLayout: Story = {
	args: {
		nodes,
		legs,
		layout: 'distance',
		state: 'completed',
		tone: 'sky',
		size: 'md',
		label: 'Distance-scaled route',
	},
};

export const RouteScanPreview: Story = {
	args: {
		nodes: [
			{
				id: 'sol',
				label: 'Sol',
				spectralClass: 'G',
				state: 'complete',
			},
			{
				id: 'unknown-contact',
				label: 'Unconfirmed contact',
				kind: 'unknown',
				state: 'active',
			},
			{
				id: 'tau-ceti',
				label: 'Tau Ceti',
				spectralClass: 'G',
				state: 'pending',
				destination: true,
			},
		],
		legs: [
			{
				id: 'scan-front',
				label: 'Scan front',
				details: ['4h 12m'],
				state: 'active',
				distanceLy: 2.8,
			},
			{
				id: 'projection',
				label: 'Projected continuation',
				state: 'pending',
				distanceLy: 5.6,
			},
		],
		layout: 'distance',
		state: 'active',
		tone: 'lilac',
		size: 'md',
		label: 'Route scan preview',
	},
};

export const CompactLogCard: Story = {
	args: { nodes: [] },
	parameters: { controls: { disable: true } },
	render: () => (
		<Panel variant="default" padding="lg">
			<TitleBar
				title="Jump — Tau Ceti"
				subtitle="Completed route"
				tone="sky"
			>
				<StatusBadge tone="success">COMPLETE</StatusBadge>
			</TitleBar>

			<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
				<Route
					nodes={nodes}
					legs={legs}
					layout="distance"
					state="completed"
					tone="sky"
					size="sm"
					label="Completed jump route"
				/>

				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(3, 1fr)',
						gap: 8,
					}}
				>
					<Readout label="Hops" value="2" tone="sky" size="sm" />
					<Readout
						label="Distance"
						value="7.6"
						tone="sky"
						size="sm"
					/>
					<Readout
						label="Status"
						value="Done"
						tone="gold"
						size="sm"
					/>
				</div>
			</div>
		</Panel>
	),
};
