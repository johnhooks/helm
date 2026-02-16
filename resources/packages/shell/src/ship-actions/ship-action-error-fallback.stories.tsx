import type { Meta, StoryObj } from '@storybook/react-vite';
import { ShipActionErrorFallback } from './ship-action-error-fallback';

const meta = {
	title: 'Ship Actions/Error Fallback',
	component: ShipActionErrorFallback,
	parameters: {
		layout: 'centered',
		backgrounds: { default: 'dark' },
		docs: { disable: true },
	},
} satisfies Meta< typeof ShipActionErrorFallback >;

export default meta;
type Story = StoryObj< typeof meta >;

export const Default: Story = {
	args: {
		error: new Error( 'Missing ShipActionFill for type: jump' ),
	},
};
