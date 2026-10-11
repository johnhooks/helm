import type { Meta, StoryObj } from '@storybook/react-vite';
import { Disclosure } from './disclosure';
import { LogCard } from '../log-card';

const meta = {
	title: 'UI/Disclosure',
	component: Disclosure,
	parameters: { layout: 'centered' },
	args: {
		label: 'Itinerary',
		children: <p>Sol → Waypoint #2 → Tau Ceti</p>,
	},
	decorators: [
		(Story) => (
			<div style={{ width: 320 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Disclosure>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Expanded: Story = { args: { defaultOpen: true } };
export const InheritedTone: Story = {
	render: (args) => (
		<div className="helm-stack">
			<LogCard title="Jump" time="05:00" tone="sky">
				<Disclosure {...args} />
			</LogCard>
			<LogCard title="Scan" time="06:00" tone="lilac">
				<Disclosure {...args} label="Discoveries" />
			</LogCard>
		</div>
	),
};
