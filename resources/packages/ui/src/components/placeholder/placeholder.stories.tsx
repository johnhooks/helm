import type { Meta, StoryObj } from '@storybook/react-vite';
import { Placeholder } from './placeholder';

const meta = {
	title: 'UI/Placeholder',
	component: Placeholder,
	parameters: {
		layout: 'centered',
		backgrounds: { default: 'dark' },
	},
} satisfies Meta<typeof Placeholder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		title: 'MVP UI',
		detail: 'Compact layout baseline',
	},
};
