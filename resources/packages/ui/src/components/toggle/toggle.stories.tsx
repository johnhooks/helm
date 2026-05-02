import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { LCARS_TONES } from '../../tones';
import { Toggle } from './toggle';

const meta = {
	title: 'Controls/Toggle',
	component: Toggle,
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
		labelPosition: {
			control: 'radio',
			options: ['left', 'right'],
		},
		disabled: { control: 'boolean' },
	},
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		label: 'Auto-scan',
		tone: 'accent',
		size: 'md',
		labelPosition: 'right',
		disabled: false,
	},
};

export const Controlled: Story = {
	parameters: { controls: { disable: true } },
	render: () => {
		const [checked, setChecked] = useState(false);
		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<Toggle
					checked={checked}
					onChange={setChecked}
					label={checked ? 'Enabled' : 'Disabled'}
				/>
				<span style={{ color: '#a39a88', fontSize: 12 }}>
					State: {checked ? 'ON' : 'OFF'}
				</span>
			</div>
		);
	},
};

export const Tones: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			<Toggle defaultChecked label="Accent" tone="accent" />
			<Toggle defaultChecked label="Orange" tone="orange" />
			<Toggle defaultChecked label="Gold" tone="gold" />
			<Toggle defaultChecked label="Blue" tone="blue" />
			<Toggle defaultChecked label="Sky" tone="sky" />
			<Toggle defaultChecked label="Success" tone="success" />
			<Toggle defaultChecked label="Lilac" tone="lilac" />
			<Toggle defaultChecked label="Violet" tone="violet" />
		</div>
	),
};

export const Sizes: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			<Toggle defaultChecked label="Small" size="sm" />
			<Toggle defaultChecked label="Medium" size="md" />
		</div>
	),
};

export const LabelPosition: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			<Toggle defaultChecked label="Label Right" labelPosition="right" />
			<Toggle defaultChecked label="Label Left" labelPosition="left" />
		</div>
	),
};

export const Disabled: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			<Toggle disabled label="Disabled Off" />
			<Toggle disabled defaultChecked label="Disabled On" />
		</div>
	),
};

export const NoLabel: Story = {
	args: {
		'aria-label': 'Toggle setting',
		defaultChecked: true,
	},
};

export const SystemSettings: Story = {
	parameters: { controls: { disable: true } },
	render: () => {
		const [settings, setSettings] = useState({
			autoScan: true,
			shields: false,
			comms: true,
			stealth: false,
		});

		const toggle = (key: keyof typeof settings) => () => {
			setSettings((s) => ({ ...s, [key]: !s[key] }));
		};

		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 16,
					padding: 20,
					background: '#141414',
					borderRadius: 12,
					minWidth: 200,
				}}
			>
				<Toggle
					checked={settings.autoScan}
					onChange={toggle('autoScan')}
					label="Auto-scan"
					tone="sky"
				/>
				<Toggle
					checked={settings.shields}
					onChange={toggle('shields')}
					label="Shields"
					tone="blue"
				/>
				<Toggle
					checked={settings.comms}
					onChange={toggle('comms')}
					label="Comms"
					tone="gold"
				/>
				<Toggle
					checked={settings.stealth}
					onChange={toggle('stealth')}
					label="Stealth"
					tone="violet"
				/>
			</div>
		);
	},
};
