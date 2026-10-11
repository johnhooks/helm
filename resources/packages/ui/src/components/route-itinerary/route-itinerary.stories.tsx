import type { Meta, StoryObj } from '@storybook/react-vite';
import { LCARS_TONES } from '../../tones';
import { RouteItinerary } from './route-itinerary';
import type { RouteItineraryNode } from './route-itinerary';

const plannedNodes: RouteItineraryNode[] = [
	{
		id: 'sol',
		label: 'Sol',
		spectralClass: 'G',
		state: 'pending',
		endpoint: 'departure',
		outgoingLeg: {
			state: 'pending',
			description: '4h 10m · 1.4 ly to next stop',
		},
	},
	{
		id: 'sirius',
		label: 'Sirius',
		spectralClass: 'A',
		state: 'pending',
		description: 'Intermediate stop',
		outgoingLeg: {
			state: 'pending',
			description: '8h 14m · 2.8 ly to next stop',
		},
	},
	{
		id: 'waypoint',
		label: 'Barnard Waypoint',
		kind: 'waypoint',
		state: 'pending',
		description: 'Intermediate stop',
		outgoingLeg: {
			state: 'pending',
			description: '6h 20m · 2.1 ly to next stop',
		},
	},
	{
		id: 'tau',
		label: 'Tau Ceti',
		spectralClass: 'G',
		state: 'pending',
		endpoint: 'destination',
	},
];
const activeNodes: RouteItineraryNode[] = [
	{
		...plannedNodes[0],
		state: 'complete',
		outgoingLeg: { state: 'complete', description: 'Complete' },
	},
	{
		...plannedNodes[1],
		state: 'active',
		current: true,
		outgoingLeg: { state: 'active', description: 'Arriving in 8h 14m' },
	},
	...plannedNodes.slice(2),
];

const meta = {
	title: 'Display/RouteItinerary',
	component: RouteItinerary,
	parameters: { layout: 'centered' },
	args: {
		label: 'Jump itinerary',
		nodes: plannedNodes,
		tone: 'sky',
		activityTone: 'gold',
		animate: true,
	},
	argTypes: {
		tone: { control: 'select', options: LCARS_TONES },
		activityTone: { control: 'select', options: LCARS_TONES },
		animate: { control: 'boolean' },
	},
	decorators: [
		(Story, context) => (
			<div
				style={{
					width: context.parameters.itineraryWidth ?? 340,
					maxWidth: 'calc(100vw - 32px)',
				}}
			>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof RouteItinerary>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Planned: Story = {};
export const ActiveJump: Story = { args: { nodes: activeNodes } };
export const Completed: Story = {
	args: {
		nodes: plannedNodes.map((node) => ({
			...node,
			state: 'complete',
			outgoingLeg: node.outgoingLeg
				? { state: 'complete', description: 'Traveled' }
				: undefined,
		})),
	},
};
export const FailedPartial: Story = {
	args: {
		summary: 'Stopped at Sirius: insufficient core for the next leg.',
		nodes: [
			activeNodes[0],
			{
				...plannedNodes[1],
				state: 'failed',
				outgoingLeg: {
					state: 'failed',
					description: 'Jump failed · Insufficient core',
				},
			},
			...plannedNodes.slice(2),
		],
	},
};
export const ActiveScan: Story = {
	args: {
		label: 'Scan discoveries',
		tone: 'lilac',
		activityTone: 'orange',
		nodes: [
			{
				id: 'sol',
				label: 'Sol',
				state: 'complete',

				outgoingLeg: { state: 'complete' },
			},
			{
				id: 'waypoint',
				label: 'Waypoint 214',
				kind: 'waypoint',
				state: 'complete',

				outgoingLeg: { state: 'complete' },
			},
			{
				id: 'scan-activity',
				label: 'Searching beyond Waypoint 214',
				kind: 'search',
				state: 'active',
				current: true,
				description: 'Next update in 5m',
				outgoingLeg: { state: 'active' },
			},
		],
		target: {
			id: 'tau',
			label: 'Target: Tau Ceti',
			description: 'Remaining path unknown. Not yet connected.',
		},
	},
};
export const IndependentNodeAndLegStates: Story = {
	args: {
		nodes: [
			{
				...plannedNodes[0],
				state: 'complete',
				current: true,
				description: 'Departure node reached',
				outgoingLeg: {
					state: 'active',
					description: 'Traveling toward Sirius',
				},
			},
			{ ...plannedNodes[1], outgoingLeg: undefined },
		],
	},
};
export const NarrowLongRoute: Story = {
	parameters: { itineraryWidth: 280 },
	args: {
		nodes: Array.from({ length: 12 }, (_, index): RouteItineraryNode => {
			let state: RouteItineraryNode['state'] = 'pending';
			if (index < 3) {
				state = 'complete';
			}
			if (index === 3) {
				state = 'active';
			}
			return {
				id: index,
				label: `Outer survey waypoint ${214 + index}`,
				kind: 'waypoint',
				state,
				current: index === 3,
				outgoingLeg:
					index < 11
						? {
								state,
								description: 'Leg timing supplied by caller',
						  }
						: undefined,
			};
		}),
	},
};
export const MotionDisabled: Story = {
	args: { nodes: activeNodes, animate: false },
};
export const TargetOnly: Story = {
	args: {
		nodes: [],
		tone: 'lilac',
		activityTone: 'orange',
		label: 'Scan target',
		target: {
			id: 'tau',
			label: 'Tau Ceti',
			description: 'No path discovered yet.',
		},
	},
};
