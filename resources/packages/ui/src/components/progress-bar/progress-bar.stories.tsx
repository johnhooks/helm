import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressBar } from './progress-bar';
import { Panel } from '../panel';
import { TitleBar } from '../title-bar';
import { Readout } from '../readout';
import { StatusBadge } from '../status-badge';
import { ArcIndicator } from '../arc-indicator';
import { StackIndicator } from '../stack-indicator';
import { LCARS_TONES } from '../../tones';

const meta = {
	title: 'Display/ProgressBar',
	component: ProgressBar,
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
			options: ['sm', 'md', 'lg'],
		},
	},
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		value: 67,
		label: 'Progress',
		tone: 'accent',
		size: 'md',
	},
	decorators: [
		(Story) => (
			<div style={{ minWidth: 300 }}>
				<Story />
			</div>
		),
	],
};

export const WithValue: Story = {
	args: {
		value: 67,
		label: 'Progress',
		showValue: true,
		tone: 'accent',
		size: 'md',
	},
	decorators: [
		(Story) => (
			<div style={{ minWidth: 300 }}>
				<Story />
			</div>
		),
	],
};

export const Sizes: Story = {
	args: { value: 0 },
	parameters: { controls: { disable: true } },
	render: () => (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 16,
				minWidth: 300,
			}}
		>
			<ProgressBar value={67} size="sm" label="Small" showValue />
			<ProgressBar value={67} size="md" label="Medium" showValue />
			<ProgressBar value={67} size="lg" label="Large" showValue />
		</div>
	),
};

export const Tones: Story = {
	args: { value: 0 },
	parameters: { controls: { disable: true } },
	render: () => (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 12,
				minWidth: 300,
			}}
		>
			<ProgressBar value={75} tone="accent" showValue />
			<ProgressBar value={75} tone="gold" showValue />
			<ProgressBar value={75} tone="sky" showValue />
			<ProgressBar value={75} tone="lilac" showValue />
			<ProgressBar value={35} tone="orange" showValue />
			<ProgressBar value={15} tone="danger" showValue />
			<ProgressBar value={100} tone="success" showValue />
		</div>
	),
};

export const Indeterminate: Story = {
	args: {
		value: 0,
		indeterminate: true,
		label: 'Loading',
		tone: 'sky',
		size: 'md',
	},
	decorators: [
		(Story) => (
			<div style={{ minWidth: 300 }}>
				<Story />
			</div>
		),
	],
};

export const Active: Story = {
	args: {
		value: 67,
		active: true,
		label: 'Jump progress',
		tone: 'sky',
		size: 'lg',
	},
	decorators: [
		(Story) => (
			<div style={{ minWidth: 300 }}>
				<Story />
			</div>
		),
	],
};

export const JumpProgress: Story = {
	args: { value: 0 },
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ minWidth: 400 }}>
			<Panel variant="default" padding="lg">
				<TitleBar
					title="Navigation"
					subtitle="Jump in Progress"
					tone="sky"
				>
					<StatusBadge tone="info">WARP 6</StatusBadge>
				</TitleBar>

				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 20,
					}}
				>
					<div>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								marginBottom: 8,
							}}
						>
							<Readout
								label="Destination"
								value="Tau Ceti"
								tone="sky"
								size="sm"
							/>
							<Readout
								label="ETA"
								value="4h 32m"
								tone="sky"
								size="sm"
							/>
						</div>
						<ProgressBar
							value={67}
							tone="sky"
							size="lg"
							label="Jump progress"
							active
						/>
					</div>

					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(2, 1fr)',
							gap: 16,
						}}
					>
						<Readout
							label="Distance"
							value={11.9}
							unit="LY"
							tone="sky"
							size="sm"
						/>
						<Readout
							label="Remaining"
							value={3.9}
							unit="LY"
							tone="sky"
							size="sm"
						/>
					</div>
				</div>
			</Panel>
		</div>
	),
};

export const ScanProgress: Story = {
	args: { value: 0 },
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ minWidth: 400 }}>
			<Panel variant="bracket" tone="lilac" padding="md">
				<div style={{ marginBottom: 16 }}>
					<div
						style={{
							fontSize: 11,
							fontWeight: 700,
							letterSpacing: '0.1em',
							color: 'var(--helm-ui-color-lilac)',
							marginBottom: 4,
							fontFamily: 'Antonio, sans-serif',
						}}
					>
						DEEP SPACE SCAN
					</div>
					<div style={{ fontSize: 12, color: '#666' }}>
						Sector 7G — Anomaly detected
					</div>
				</div>
				<ProgressBar
					value={42}
					tone="lilac"
					size="md"
					showValue
					label="Scan progress"
				/>
			</Panel>
		</div>
	),
};

export const RepairProgress: Story = {
	args: { value: 0 },
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ minWidth: 400 }}>
			<Panel variant="default" padding="lg">
				<TitleBar title="Damage Control" tone="orange">
					<StatusBadge tone="warning">REPAIRS</StatusBadge>
				</TitleBar>

				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 16,
					}}
				>
					<div>
						<div
							style={{
								fontSize: 10,
								color: '#666',
								marginBottom: 6,
								fontFamily: 'Antonio, sans-serif',
								letterSpacing: '0.1em',
							}}
						>
							PORT SHIELD EMITTER
						</div>
						<ProgressBar
							value={78}
							tone="orange"
							size="md"
							showValue
							label="Repair progress"
						/>
					</div>
					<div>
						<div
							style={{
								fontSize: 10,
								color: '#666',
								marginBottom: 6,
								fontFamily: 'Antonio, sans-serif',
								letterSpacing: '0.1em',
							}}
						>
							HULL SECTION 14
						</div>
						<ProgressBar
							value={23}
							tone="danger"
							size="md"
							showValue
							label="Repair progress"
						/>
					</div>
					<div>
						<div
							style={{
								fontSize: 10,
								color: '#666',
								marginBottom: 6,
								fontFamily: 'Antonio, sans-serif',
								letterSpacing: '0.1em',
							}}
						>
							TARGETING ARRAY
						</div>
						<ProgressBar
							value={100}
							tone="success"
							size="md"
							showValue
							label="Repair complete"
						/>
					</div>
				</div>
			</Panel>
		</div>
	),
};

export const MultipleOperations: Story = {
	args: { value: 0 },
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ minWidth: 450 }}>
			<Panel variant="default" padding="lg">
				<TitleBar
					title="Operations"
					subtitle="Active Tasks"
					tone="gold"
				/>

				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 20,
					}}
				>
					<div>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: 6,
							}}
						>
							<span
								style={{
									fontSize: 11,
									color: '#ccc',
									fontFamily: 'Antonio, sans-serif',
									letterSpacing: '0.05em',
								}}
							>
								JUMP TO TAU CETI
							</span>
							<span style={{ fontSize: 10, color: '#666' }}>
								4h 32m remaining
							</span>
						</div>
						<ProgressBar value={67} tone="sky" size="sm" active />
					</div>

					<div>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: 6,
							}}
						>
							<span
								style={{
									fontSize: 11,
									color: '#ccc',
									fontFamily: 'Antonio, sans-serif',
									letterSpacing: '0.05em',
								}}
							>
								DEEP SPACE SCAN
							</span>
							<span style={{ fontSize: 10, color: '#666' }}>
								2h 15m remaining
							</span>
						</div>
						<ProgressBar value={42} tone="lilac" size="sm" active />
					</div>

					<div>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: 6,
							}}
						>
							<span
								style={{
									fontSize: 11,
									color: '#ccc',
									fontFamily: 'Antonio, sans-serif',
									letterSpacing: '0.05em',
								}}
							>
								SHIELD REPAIR
							</span>
							<span style={{ fontSize: 10, color: '#666' }}>
								45m remaining
							</span>
						</div>
						<ProgressBar
							value={78}
							tone="orange"
							size="sm"
							active
						/>
					</div>

					<div>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: 6,
							}}
						>
							<span
								style={{
									fontSize: 11,
									color: '#ccc',
									fontFamily: 'Antonio, sans-serif',
									letterSpacing: '0.05em',
								}}
							>
								CARGO TRANSFER
							</span>
							<span style={{ fontSize: 10, color: '#666' }}>
								Processing...
							</span>
						</div>
						<ProgressBar
							value={0}
							tone="gold"
							size="sm"
							indeterminate
						/>
					</div>
				</div>
			</Panel>
		</div>
	),
};

export const IndicatorsAsProgress: Story = {
	args: { value: 0 },
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ minWidth: 500 }}>
			<Panel variant="default" padding="lg">
				<TitleBar title="Active Operations" tone="gold" />

				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(3, 1fr)',
						gap: 24,
					}}
				>
					{/* Arc as progress */}
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 12,
						}}
						role="progressbar"
						aria-valuenow={67}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-label="Jump progress"
					>
						<ArcIndicator level={67} size="2xl" tone="sky" />
						<div style={{ textAlign: 'center' }}>
							<div
								style={{
									fontSize: 10,
									color: '#666',
									fontFamily: 'Antonio, sans-serif',
									letterSpacing: '0.1em',
								}}
							>
								JUMP
							</div>
							<div
								style={{
									fontSize: 18,
									fontWeight: 700,
									color: 'var(--helm-ui-color-sky)',
								}}
							>
								67%
							</div>
							<div style={{ fontSize: 10, color: '#666' }}>
								4h 32m
							</div>
						</div>
					</div>

					{/* Stack as progress */}
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 12,
						}}
						role="progressbar"
						aria-valuenow={42}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-label="Scan progress"
					>
						<StackIndicator
							level={42}
							segments={5}
							size="2xl"
							tone="lilac"
						/>
						<div style={{ textAlign: 'center' }}>
							<div
								style={{
									fontSize: 10,
									color: '#666',
									fontFamily: 'Antonio, sans-serif',
									letterSpacing: '0.1em',
								}}
							>
								SCAN
							</div>
							<div
								style={{
									fontSize: 18,
									fontWeight: 700,
									color: 'var(--helm-ui-color-lilac)',
								}}
							>
								42%
							</div>
							<div style={{ fontSize: 10, color: '#666' }}>
								2h 15m
							</div>
						</div>
					</div>

					{/* Arc as progress */}
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 12,
						}}
						role="progressbar"
						aria-valuenow={78}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-label="Repair progress"
					>
						<ArcIndicator level={78} size="2xl" tone="orange" />
						<div style={{ textAlign: 'center' }}>
							<div
								style={{
									fontSize: 10,
									color: '#666',
									fontFamily: 'Antonio, sans-serif',
									letterSpacing: '0.1em',
								}}
							>
								REPAIR
							</div>
							<div
								style={{
									fontSize: 18,
									fontWeight: 700,
									color: 'var(--helm-ui-color-orange)',
								}}
							>
								78%
							</div>
							<div style={{ fontSize: 10, color: '#666' }}>
								45m
							</div>
						</div>
					</div>
				</div>
			</Panel>
		</div>
	),
};
