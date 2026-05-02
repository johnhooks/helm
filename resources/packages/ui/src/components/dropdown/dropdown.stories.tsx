import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dropdown } from './dropdown';
import { Panel } from '../panel';
import { Toggle } from '../toggle';
import { SegmentedControl } from '../segmented-control';

const meta = {
	title: 'Overlay/Dropdown',
	component: Dropdown,
	parameters: {
		layout: 'centered',
		backgrounds: { default: 'dark' },
	},
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		label: 'Menu',
		renderTrigger: (props) => (
			<button
				{...props}
				type="button"
				style={{
					color: '#f0e6d2',
					background: '#333',
					border: '1px solid #555',
					padding: '6px 12px',
					cursor: 'pointer',
				}}
			>
				Open dropdown
			</button>
		),
		children: (
			<Panel tone="neutral" padding="sm">
				<div style={{ color: '#f0e6d2', fontSize: 13, minWidth: 160 }}>
					Dropdown content goes here
				</div>
			</Panel>
		),
	},
};

export const BottomEnd: Story = {
	args: {
		label: 'Menu',
		placement: 'bottom-end',
		renderTrigger: (props) => (
			<button
				{...props}
				type="button"
				style={{
					color: '#f0e6d2',
					background: '#333',
					border: '1px solid #555',
					padding: '6px 12px',
					cursor: 'pointer',
				}}
			>
				Bottom end
			</button>
		),
		children: (
			<Panel tone="neutral" padding="sm">
				<div style={{ color: '#f0e6d2', fontSize: 13, minWidth: 160 }}>
					Aligned to the right edge
				</div>
			</Panel>
		),
	},
};

export const WithControls: Story = {
	args: Default.args,
	render: () => {
		const [starSize, setStarSize] = useState('md');
		const [jumpRange, setJumpRange] = useState(false);
		const [labels, setLabels] = useState(false);

		return (
			<div
				style={{
					display: 'flex',
					justifyContent: 'flex-end',
					width: 400,
				}}
			>
				<Dropdown
					label="Viewport settings"
					placement="bottom-end"
					renderTrigger={(props) => (
						<button
							{...props}
							type="button"
							style={{
								color: '#9f9a90',
								background: 'none',
								border: 'none',
								padding: 4,
								cursor: 'pointer',
								fontSize: 18,
							}}
							aria-label="Viewport settings"
						>
							&#9881;
						</button>
					)}
				>
					<Panel tone="neutral" padding="sm">
						<div
							style={{
								minWidth: 200,
								display: 'flex',
								flexDirection: 'column',
								gap: 8,
							}}
						>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									gap: 8,
								}}
							>
								<span
									style={{
										fontSize: 12,
										color: '#f0e6d2',
										whiteSpace: 'nowrap',
									}}
								>
									Star size
								</span>
								<SegmentedControl
									options={[
										{ value: 'sm', label: 'S' },
										{ value: 'md', label: 'M' },
										{ value: 'lg', label: 'L' },
									]}
									value={starSize}
									onChange={setStarSize}
									size="sm"
								/>
							</div>
							<Toggle
								label="Jump range"
								checked={jumpRange}
								onChange={setJumpRange}
								size="sm"
							/>
							<Toggle
								label="Labels"
								checked={labels}
								onChange={setLabels}
								disabled={!jumpRange}
								size="sm"
							/>
						</div>
					</Panel>
				</Dropdown>
			</div>
		);
	},
};

export const OnOpenChange: Story = {
	args: Default.args,
	render: () => {
		const [log, setLog] = useState<string[]>([]);

		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 16,
					alignItems: 'flex-start',
				}}
			>
				<Dropdown
					label="Demo"
					onOpenChange={(isOpen) =>
						setLog((prev) => [
							...prev,
							`${
								isOpen ? 'opened' : 'closed'
							} at ${new Date().toLocaleTimeString()}`,
						])
					}
					renderTrigger={(props) => (
						<button
							{...props}
							type="button"
							style={{
								color: '#f0e6d2',
								background: '#333',
								border: '1px solid #555',
								padding: '6px 12px',
								cursor: 'pointer',
							}}
						>
							Toggle
						</button>
					)}
				>
					<Panel tone="neutral" padding="sm">
						<div
							style={{
								color: '#f0e6d2',
								fontSize: 13,
								minWidth: 160,
							}}
						>
							Content
						</div>
					</Panel>
				</Dropdown>
				<div
					style={{
						color: '#9f9a90',
						fontSize: 11,
						fontFamily: 'monospace',
					}}
				>
					{log.map((entry, i) => (
						<div key={i}>{entry}</div>
					))}
				</div>
			</div>
		);
	},
};
