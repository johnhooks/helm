import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	Disclosure,
	LogCard,
	Readout,
	RouteItinerary,
	StatusBadge,
	SystemCell,
	SystemGrid,
} from '@helm/ui';
import './itinerary-disclosure.css';

const route = [
	{
		id: 1,
		label: 'Sol',
		kind: 'star' as const,
		state: 'complete' as const,
		endpoint: 'departure' as const,
		outgoingLeg: { state: 'complete' as const },
	},
	{
		id: 2,
		label: 'Waypoint #2',
		kind: 'waypoint' as const,
		state: 'complete' as const,
		outgoingLeg: { state: 'complete' as const },
	},
	{
		id: 7,
		label: 'Tau Ceti',
		kind: 'star' as const,
		state: 'complete' as const,
		endpoint: 'destination' as const,
	},
];

// Presentation experiment only: a compact itinerary control within an action card.
function CommandStrip({
	initialOpen = false,
	narrow = false,
}: {
	initialOpen?: boolean;
	narrow?: boolean;
}) {
	return (
		<div
			className="helm-command-study"
			style={{ width: narrow ? 320 : 400 }}
		>
			<LogCard
				time="05:00"
				title="Jump — Tau Ceti"
				tone="sky"
				status={
					<StatusBadge tone="success" size="sm">
						Complete
					</StatusBadge>
				}
			>
				<SystemGrid columns={3} gap="sm">
					<SystemCell>
						<Readout
							label="Route legs"
							value={2}
							tone="sky"
							size="sm"
						/>
					</SystemCell>
					<SystemCell>
						<Readout
							label="Completed"
							value={2}
							tone="sky"
							size="sm"
						/>
					</SystemCell>
					<SystemCell>
						<Readout
							label="Core life"
							value={92}
							tone="gold"
							size="sm"
						/>
					</SystemCell>
				</SystemGrid>
				<Disclosure
					label="Itinerary"
					defaultOpen={initialOpen}
					className="helm-mt-4"
				>
					<RouteItinerary
						label="Flight itinerary"
						nodes={route}
						tone="sky"
					/>
				</Disclosure>
			</LogCard>
		</div>
	);
}

const meta = {
	title: 'Design Explorations/Ship Actions/Itinerary Disclosure',
	parameters: { layout: 'centered' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const CommandStripClosed: Story = { render: () => <CommandStrip /> };
export const FlightItinerary: Story = {
	render: () => <CommandStrip initialOpen />,
};
export const Narrow: Story = {
	render: () => <CommandStrip initialOpen narrow />,
};
