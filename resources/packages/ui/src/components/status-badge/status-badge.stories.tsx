import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusBadge } from './status-badge';
import { LCARS_TONES } from '../../tones';

const meta = {
	title: 'Display/StatusBadge',
	component: StatusBadge,
	parameters: {
		layout: 'centered',
		backgrounds: { default: 'dark' },
	},
	argTypes: {
		tone: {
			control: 'select',
			options: [...LCARS_TONES],
		},
		size: {
			control: 'radio',
			options: ['sm', 'md'],
		},
		pulse: { control: 'boolean' },
	},
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: 'Online',
		tone: 'success',
		size: 'md',
		pulse: false,
	},
};

export const Tones: Story = {
	args: { children: '' },
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			<StatusBadge tone="neutral">Idle</StatusBadge>
			<StatusBadge tone="muted">Offline</StatusBadge>
			<StatusBadge tone="success">Online</StatusBadge>
			<StatusBadge tone="warning">Warning</StatusBadge>
			<StatusBadge tone="danger">Critical</StatusBadge>
			<StatusBadge tone="info">Scanning</StatusBadge>
			<StatusBadge tone="accent">Active</StatusBadge>
		</div>
	),
};

export const LcarsTones: Story = {
	args: { children: '' },
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			<StatusBadge tone="orange">Alert</StatusBadge>
			<StatusBadge tone="gold">Standby</StatusBadge>
			<StatusBadge tone="blue">Computing</StatusBadge>
			<StatusBadge tone="sky">Charging</StatusBadge>
			<StatusBadge tone="lilac">Calibrating</StatusBadge>
			<StatusBadge tone="violet">Analyzing</StatusBadge>
		</div>
	),
};

export const Sizes: Story = {
	args: { children: '' },
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			<StatusBadge size="sm" tone="success">
				Small
			</StatusBadge>
			<StatusBadge size="md" tone="success">
				Medium
			</StatusBadge>
		</div>
	),
};

export const Pulsing: Story = {
	args: { children: '' },
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			<StatusBadge tone="success" pulse>
				Online
			</StatusBadge>
			<StatusBadge tone="info" pulse>
				Scanning
			</StatusBadge>
			<StatusBadge tone="warning" pulse>
				Low Power
			</StatusBadge>
			<StatusBadge tone="danger" pulse>
				Critical
			</StatusBadge>
		</div>
	),
};

export const ShipSystems: Story = {
	args: { children: '' },
	parameters: { controls: { disable: true } },
	render: () => (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: '1fr 1fr',
				gap: '16px 32px',
				padding: 20,
				background: '#141414',
				borderRadius: 12,
			}}
		>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				<span
					style={{
						color: '#a39a88',
						fontSize: 10,
						letterSpacing: '0.1em',
					}}
				>
					WARP CORE
				</span>
				<StatusBadge tone="success">Online</StatusBadge>
			</div>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				<span
					style={{
						color: '#a39a88',
						fontSize: 10,
						letterSpacing: '0.1em',
					}}
				>
					SENSORS
				</span>
				<StatusBadge tone="info" pulse>
					Scanning
				</StatusBadge>
			</div>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				<span
					style={{
						color: '#a39a88',
						fontSize: 10,
						letterSpacing: '0.1em',
					}}
				>
					DRIVE
				</span>
				<StatusBadge tone="neutral">Idle</StatusBadge>
			</div>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				<span
					style={{
						color: '#a39a88',
						fontSize: 10,
						letterSpacing: '0.1em',
					}}
				>
					SHIELDS
				</span>
				<StatusBadge tone="muted">Offline</StatusBadge>
			</div>
		</div>
	),
};
