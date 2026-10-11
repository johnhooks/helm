import type { Meta, StoryObj } from '@storybook/react-vite';
import { Panel } from '../panel';
import { Readout } from '../readout';
import { StatusBadge } from '../status-badge';
import { TitleBar } from '../title-bar';
import { RouteStepIndicator } from './route-step-indicator';
import type { RouteLeg, RouteNode } from '../route';

const meta = {
	title: 'Display/RouteStepIndicator',
	component: RouteStepIndicator,
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
} satisfies Meta<typeof RouteStepIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

const plannedNodes: RouteNode[] = [
	{
		id: 1,
		label: 'Sol',
		spectralClass: 'G',
		state: 'complete',
		current: true,
	},
	{
		id: 2,
		label: 'Barnard Waypoint',
		kind: 'waypoint',
		state: 'pending',
	},
	{
		id: 3,
		label: 'Tau Ceti',
		spectralClass: 'G',
		state: 'pending',
		destination: true,
	},
];

const plannedLegs: RouteLeg[] = [
	{ id: '1-2', details: ['1d 8h'], state: 'pending' },
	{ id: '2-3', details: ['2d 3h'], state: 'pending' },
];

export const Default: Story = {
	args: {
		nodes: plannedNodes,
		legs: plannedLegs,
		state: 'planned',
		tone: 'sky',
		size: 'md',
		label: 'Jump route preview',
	},
};

export const ActiveJump: Story = {
	args: {
		nodes: [
			{
				id: 1,
				label: 'Sol',
				spectralClass: 'G',
				state: 'complete',
			},
			{
				id: 2,
				label: 'Barnard Waypoint',
				kind: 'waypoint',
				state: 'active',
				current: true,
			},
			{
				id: 3,
				label: 'Luyten 726-8',
				spectralClass: 'M',
				state: 'pending',
			},
			{
				id: 4,
				label: 'Tau Ceti',
				spectralClass: 'G',
				state: 'pending',
				destination: true,
			},
		],
		legs: [
			{ id: '1-2', details: ['1d 8h'], state: 'complete' },
			{ id: '2-3', details: ['18h 42m'], state: 'active', progress: 62 },
			{ id: '3-4', details: ['1d 11h'], state: 'pending' },
		],
		state: 'active',
		tone: 'sky',
		size: 'md',
		label: 'Active jump route progress',
	},
};

export const StellarTypes: Story = {
	args: {
		nodes: [
			{
				id: 'giant',
				label: 'Aldebaran',
				spectralClass: 'K',
				stellarType: 'giant',
				state: 'complete',
			},
			{
				id: 'white-dwarf',
				label: 'Sirius B',
				spectralClass: 'A',
				stellarType: 'whiteDwarf',
				state: 'complete',
				current: true,
			},
			{
				id: 'neutron',
				label: 'Calvera',
				stellarType: 'neutron',
				state: 'pending',
			},
			{
				id: 'pulsar',
				label: 'Vela Pulsar',
				stellarType: 'pulsar',
				state: 'pending',
			},
			{
				id: 'brown-dwarf',
				label: 'Luhman 16',
				spectralClass: 'M',
				stellarType: 'brownDwarf',
				state: 'pending',
				destination: true,
			},
		],
		legs: [
			{ details: ['3d 2h'], state: 'complete' },
			{ details: ['1d 18h'], state: 'active' },
			{ details: ['4d 9h'], state: 'pending' },
			{ details: ['2d 12h'], state: 'pending' },
		],
		state: 'active',
		tone: 'gold',
		size: 'md',
		label: 'Exotic stellar route',
	},
};

export const RouteScan: Story = {
	args: {
		nodes: [
			{
				id: 1,
				label: 'Sol',
				spectralClass: 'G',
				state: 'complete',
				current: true,
			},
			{
				id: 2,
				label: 'Unconfirmed Waypoint',
				kind: 'unknown',
				state: 'active',
			},
			{
				id: 3,
				label: 'Tau Ceti',
				spectralClass: 'G',
				state: 'pending',
				destination: true,
			},
		],
		legs: [
			{
				id: 'scan-1',
				label: 'Scan front',
				details: ['4h 12m'],
				state: 'active',
			},
			{ id: 'scan-2', label: 'Projected continuation', state: 'pending' },
		],
		state: 'active',
		tone: 'lilac',
		size: 'md',
		label: 'Route scan progress',
	},
};

export const FailedPartial: Story = {
	args: {
		nodes: [
			{
				id: 1,
				label: 'Sol',
				spectralClass: 'G',
				state: 'complete',
			},
			{
				id: 2,
				label: 'Waypoint 214',
				kind: 'waypoint',
				state: 'complete',
				current: true,
			},
			{
				id: 3,
				label: 'Unknown contact',
				kind: 'unknown',
				state: 'failed',
			},
			{
				id: 4,
				label: 'Tau Ceti',
				spectralClass: 'G',
				state: 'pending',
				destination: true,
			},
		],
		legs: [
			{ id: '1-2', details: ['7h 44m'], state: 'complete' },
			{ id: '2-3', details: ['unknown'], state: 'failed' },
			{ id: '3-4', state: 'pending' },
		],
		state: 'partial',
		tone: 'lilac',
		size: 'md',
		label: 'Partial route progress',
	},
};

export const DistanceJump: Story = {
	args: {
		nodes: [
			{
				id: 'sol',
				label: 'Sol',
				spectralClass: 'G',
				state: 'complete',
			},
			{
				id: 'sirius',
				label: 'Sirius',
				spectralClass: 'A',
				state: 'complete',
			},
			{
				id: 'luyten',
				label: 'Luyten 726-8',
				spectralClass: 'M',
				state: 'active',
				current: true,
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
				id: 'sol-sirius',
				details: ['2h 10m'],
				state: 'complete',
				distanceLy: 1.4,
			},
			{
				id: 'sirius-luyten',
				details: ['9h 35m'],
				state: 'complete',
				distanceLy: 6.2,
			},
			{
				id: 'luyten-tau-ceti',
				details: ['3h 44m'],
				state: 'active',
				progress: 41,
				distanceLy: 2.4,
			},
		],
		layout: 'distance',
		state: 'active',
		tone: 'sky',
		size: 'md',
		label: 'Distance jump route progress',
	},
};

export const CompactCard: Story = {
	args: { nodes: [] },
	parameters: { controls: { disable: true } },
	render: () => (
		<Panel variant="default" padding="lg">
			<TitleBar
				title="Jump — Tau Ceti"
				subtitle="Route-aware jump"
				tone="sky"
			>
				<StatusBadge tone="info">ACTIVE</StatusBadge>
			</TitleBar>

			<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
				<RouteStepIndicator
					nodes={[
						{
							id: 'sol',
							label: 'Sol',
							spectralClass: 'G',
							state: 'complete',
						},
						{
							id: 'sirius',
							label: 'Sirius',
							spectralClass: 'A',
							state: 'complete',
						},
						{
							id: 'luyten',
							label: 'Luyten 726-8',
							spectralClass: 'M',
							state: 'active',
							current: true,
						},
						{
							id: 'tau-ceti',
							label: 'Tau Ceti',
							spectralClass: 'G',
							state: 'pending',
							destination: true,
						},
					]}
					legs={[
						{ details: ['12h 20m'], state: 'complete' },
						{ details: ['1d 2h'], state: 'complete' },
						{ details: ['8h 14m'], state: 'active', progress: 73 },
					]}
					state="active"
					tone="sky"
					size="sm"
					label="Active jump route progress"
				/>

				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(3, 1fr)',
						gap: 8,
					}}
				>
					<Readout label="Hops" value="3" tone="sky" size="sm" />
					<Readout label="Done" value="2" tone="sky" size="sm" />
					<Readout label="ETA" value="8h" tone="gold" size="sm" />
				</div>
			</div>
		</Panel>
	),
};
