import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Countdown, LogCard, Readout, RouteItinerary } from '@helm/ui';
import './scan-readout-experiments.css';

interface ExperimentProps {
	width: number;
	chance: number;
	cycle: number;
}

function Comparison({ width, chance, cycle }: ExperimentProps) {
	return (
		<div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
			{(['standard', 'content-width'] as const).map((layout) => (
				<section key={layout} style={{ width, maxWidth: '100%' }}>
					<h3>{layout}</h3>
					<LogCard
						time="now"
						title="Scanning to Tau Ceti"
						tone="lilac"
						variant="active"
					>
						<div
							className={`scan-readout-experiment scan-readout-experiment--${layout}`}
						>
							<div className="scan-readout-experiment__stats">
								<Readout
									label="Distance"
									value={3.64}
									unit="ly"
									tone="lilac"
									size="sm"
								/>
								<Readout
									label="Cycle"
									value={cycle}
									tone="lilac"
									size="sm"
								/>
								<Readout
									label="Chance"
									value={`${chance.toFixed(1)}%`}
									tone="lilac"
									size="sm"
								/>
							</div>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
								}}
							>
								<Countdown
									label="Next update"
									remaining="04:32"
									tone="lilac"
									size="sm"
									active
								/>
								<Button size="sm" variant="tertiary">
									Cancel
								</Button>
							</div>
							<RouteItinerary
								label="Scan route"
								tone="lilac"
								nodes={[
									{
										id: 1,
										label: 'Sol',
										state: 'complete',
										spectralClass: 'G',
										endpoint: 'departure',
										outgoingLeg: { state: 'active' },
									},
									{
										id: 2,
										label: 'Searching beyond Sol',
										kind: 'search',
										state: 'active',
									},
								]}
								target={{
									id: 3,
									label: 'Tau Ceti',
									spectralClass: 'G',
									description: 'Path not yet connected',
								}}
							/>
						</div>
					</LogCard>
				</section>
			))}
		</div>
	);
}

const meta = {
	title: 'Design Explorations/Ship Actions/Scan Readouts',
	component: Comparison,
	parameters: { layout: 'padded' },
	args: { width: 380, chance: 24, cycle: 169 },
	argTypes: {
		width: { control: { type: 'range', min: 280, max: 480, step: 10 } },
		chance: { control: { type: 'range', min: 0.1, max: 90, step: 0.1 } },
		cycle: { control: { type: 'number', min: 1, max: 720 } },
	},
} satisfies Meta<typeof Comparison>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Layouts: Story = {};
export const EarlyScan: Story = {
	args: { chance: 0.1, cycle: 1 },
};
export const Narrow: Story = { args: { width: 300, chance: 90, cycle: 720 } };
