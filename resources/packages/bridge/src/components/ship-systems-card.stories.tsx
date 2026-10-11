import type { Meta, StoryObj } from '@storybook/react-vite';
import { ShipSystemsPanel } from './ship-systems-card';

const meta = {
	title: 'Bridge/Ship Systems',
	component: ShipSystemsPanel,
	parameters: { layout: 'centered' },
	decorators: [
		(Story) => (
			<div style={{ width: 380 }}>
				<Story />
			</div>
		),
	],
	args: {
		ship: { power_max: 100, power_full_at: null, power_mode: 'normal' },
		powerMode: 'normal',
		onPowerModeChange: () => {},
		stats: {
			engineering: {
				rechargeRate: 10,
				coreLife: 750,
				outputMult: 1,
				condition: 100,
			},
			navigation: { range: 5, speed: 5, draw: 1, condition: 100 },
			sensors: {
				range: 10,
				scanDuration: 1,
				discovery: 75,
				condition: 100,
			},
		},
	},
} satisfies Meta<typeof ShipSystemsPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const FullPower: Story = {};
export const Recharging: Story = {
	args: {
		ship: {
			power_max: 100,
			power_mode: 'normal',
			power_full_at: new Date(Date.now() + 5 * 3600000).toISOString(),
		},
	},
};
export const Exhausted: Story = {
	args: {
		ship: {
			power_max: 100,
			power_mode: 'normal',
			power_full_at: new Date(Date.now() + 10 * 3600000).toISOString(),
		},
	},
};
