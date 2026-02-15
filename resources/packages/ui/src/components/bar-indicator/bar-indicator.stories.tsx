import type { Meta, StoryObj } from '@storybook/react-vite';
import { BarIndicator } from './bar-indicator';
import { LCARS_TONES } from '../../tones';

const meta = {
	title: 'UI/Indicators/Bar',
	component: BarIndicator,
	parameters: {
		layout: 'centered',
	},
	argTypes: {
		size: {
			control: 'inline-radio',
			options: ['sm', 'md', 'lg', 'xl', '2xl'],
		},
		tone: {
			control: 'select',
			options: [...LCARS_TONES],
		},
		level: { control: { type: 'range', min: 0, max: 100 } },
	},
} satisfies Meta<typeof BarIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		size: 'md',
		tone: 'orange',
		level: 62,
	},
};

export const Sizes: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				gap: '12px',
			}}
		>
			<BarIndicator size="sm" tone="orange" level={62} />
			<BarIndicator size="md" tone="orange" level={62} />
			<BarIndicator size="lg" tone="orange" level={62} />
			<BarIndicator size="xl" tone="orange" level={62} />
			<BarIndicator size="2xl" tone="orange" level={62} />
		</div>
	),
};
