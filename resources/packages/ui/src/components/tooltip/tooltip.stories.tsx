import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tooltip } from './tooltip';

const meta = {
	title: 'Display/Tooltip',
	component: Tooltip,
	parameters: {
		layout: 'centered',
		backgrounds: { default: 'dark' },
	},
	argTypes: {
		placement: {
			control: 'select',
			options: [
				'top',
				'top-start',
				'top-end',
				'bottom',
				'bottom-start',
				'bottom-end',
				'left',
				'right',
			],
		},
		delay: {
			control: 'number',
		},
	},
	decorators: [
		(Story) => (
			<div style={{ padding: 60 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		text: 'Tau Ceti — 2d 3h',
		placement: 'top',
		// A native element: the anchor must take a ref and spread props,
		// which @helm/ui Button does not do yet.
		children: <button type="button">Hover or focus me</button>,
	},
};
