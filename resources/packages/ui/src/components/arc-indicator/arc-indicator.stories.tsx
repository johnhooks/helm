import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArcIndicator } from './arc-indicator';

const meta = {
	title: 'UI/Indicators/Arc',
	component: ArcIndicator,
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
			options: [
				'neutral',
				'base',
				'accent',
				'muted',
				'danger',
				'success',
				'warning',
				'info',
				'orange',
				'gold',
				'peach',
				'sunset',
				'blue',
				'sky',
				'ice',
				'lilac',
				'violet',
				'plum',
				'hopbush',
			],
		},
		level: { control: { type: 'range', min: 0, max: 100 } },
	},
} satisfies Meta<typeof ArcIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		size: 'md',
		tone: 'gold',
		level: 62,
	},
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
			<ArcIndicator size="sm" tone="gold" level={62} />
			<ArcIndicator size="md" tone="gold" level={62} />
			<ArcIndicator size="lg" tone="gold" level={62} />
			<ArcIndicator size="xl" tone="gold" level={62} />
			<ArcIndicator size="2xl" tone="gold" level={62} />
		</div>
	),
};
