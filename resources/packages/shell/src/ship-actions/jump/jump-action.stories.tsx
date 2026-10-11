import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	JumpCard,
	JumpLifecycle,
	OutcomeCard,
} from '../story-fixtures/action-card-stories';

// Card presentation scenarios; action data remains illustrative until app integration.
const meta = {
	title: 'Design Explorations/Ship Actions/Jump',
	parameters: { layout: 'centered' },
	args: { width: 380 },
	argTypes: {
		width: { control: { type: 'range', min: 280, max: 720, step: 20 } },
	},
	decorators: [
		(Story, context) => (
			<div
				className="ship-action-story"
				style={{
					width: context.args.width,
					maxWidth: 'calc(100vw - 32px)',
				}}
			>
				<Story />
			</div>
		),
	],
} satisfies Meta<{ width: number }>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Draft: Story = { render: () => <JumpLifecycle /> };
export const Running: Story = { render: () => <JumpCard /> };
export const Fulfilled: Story = {
	render: () => <OutcomeCard outcome="fulfilled" />,
};
export const Partial: Story = {
	render: () => <OutcomeCard outcome="partial" />,
};
export const Failed: Story = { render: () => <OutcomeCard outcome="failed" /> };
export const DraftToActive: Story = { render: () => <JumpLifecycle /> };
export const Narrow: Story = {
	args: { width: 320 },
	render: () => <JumpCard />,
};
export const LongDraft: Story = {
	args: { width: 320 },
	render: () => <JumpLifecycle long />,
};
export const WideDraft: Story = {
	args: { width: 640 },
	render: () => <JumpLifecycle />,
};
