import type { Meta, StoryObj } from '@storybook/react-vite';
import { WarpIndicator } from './warp-indicator';
import { LCARS_TONES } from '../../tones';

const meta = {
	title: 'UI/Indicators/Warp',
	component: WarpIndicator,
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
		segments: { control: { type: 'number', min: 4, max: 14 } },
	},
} satisfies Meta<typeof WarpIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
	args: {
		level: 62,
		size: 'md',
		tone: 'orange',
		segments: 10,
	},
};

export const Sizes: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
			<WarpIndicator
				size="sm"
				tone="orange"
				level={62}
				segments={10}
				transitionMs={0}
			/>
			<WarpIndicator
				size="md"
				tone="orange"
				level={62}
				segments={10}
				transitionMs={0}
			/>
			<WarpIndicator
				size="lg"
				tone="orange"
				level={62}
				segments={10}
				transitionMs={0}
			/>
			<WarpIndicator
				size="xl"
				tone="orange"
				level={62}
				segments={10}
				transitionMs={0}
			/>
			<WarpIndicator
				size="2xl"
				tone="orange"
				level={62}
				segments={10}
				transitionMs={0}
			/>
		</div>
	),
};
