import type { Meta, StoryObj } from '@storybook/react-vite';
import { LogCard } from './log-card';
import { StatusBadge } from '../status-badge';
import { Readout } from '../readout';
import { Countdown } from '../countdown';
import { ProgressBar } from '../progress-bar';
import { Button } from '../button';

const meta = {
	title: 'Components/LogCard',
	component: LogCard,
	parameters: {
		layout: 'centered',
		backgrounds: { default: 'dark' },
	},
	decorators: [
		(Story) => (
			<div style={{ width: 380 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof LogCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ================================================================
 *  Default — completed entry
 * ============================================================= */

export const Default: Story = {
	args: {
		time: '08:42',
		title: 'Docked at Sol Station',
		tone: 'accent',
		status: (
			<StatusBadge tone="success" size="sm">
				Complete
			</StatusBadge>
		),
	},
};

/* ================================================================
 *  Active — in-progress with progress bar + countdown
 * ============================================================= */

export const Active: Story = {
	args: {
		time: 'now',
		title: 'Scanning Sol IV',
		tone: 'lilac',
		variant: 'active',
		status: (
			<StatusBadge tone="info" size="sm" pulse>
				In Progress
			</StatusBadge>
		),
		children: (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				<ProgressBar value={32} tone="lilac" size="sm" />
				<Countdown
					remaining={4320}
					tone="lilac"
					active
					label="Remaining"
					size="sm"
				/>
			</div>
		),
	},
};

/* ================================================================
 *  Draft — pending confirmation with sweep animation
 * ============================================================= */

export const Draft: Story = {
	args: {
		time: 'draft',
		title: 'Jump to Tau Ceti',
		tone: 'sky',
		variant: 'draft',
		status: (
			<StatusBadge tone="warning" size="sm">
				Pending
			</StatusBadge>
		),
		children: (
			<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
				<Readout
					label="Distance"
					value="11.9"
					unit="ly"
					tone="sky"
					size="sm"
				/>
				<Readout label="ETA" value="4d 2h" tone="sky" size="sm" />
				<Readout
					label="Draw"
					value={120}
					unit="MJ"
					tone="gold"
					size="sm"
				/>
			</div>
		),
		action: (
			<div style={{ display: 'flex', gap: 8 }}>
				<Button variant="primary" size="sm">
					Confirm Jump
				</Button>
				<Button variant="tertiary" size="sm">
					Cancel
				</Button>
			</div>
		),
	},
};

/* ================================================================
 *  Tones — all tone variants as completed entries
 * ============================================================= */

export const Tones: Story = {
	args: { time: '', title: '' },
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
			{(
				['accent', 'sky', 'lilac', 'gold', 'orange', 'neutral'] as const
			).map((tone) => (
				<LogCard
					key={tone}
					time="08:42"
					title={`Entry with ${tone} tone`}
					tone={tone}
					status={
						<StatusBadge tone="success" size="sm">
							Complete
						</StatusBadge>
					}
				/>
			))}
		</div>
	),
};

/* ================================================================
 *  JumpDraft — composition example
 * ============================================================= */

export const JumpDraft: Story = {
	args: {
		time: 'draft',
		title: 'Jump to Tau Ceti',
		tone: 'sky',
		variant: 'draft',
		status: (
			<StatusBadge tone="warning" size="sm">
				Pending
			</StatusBadge>
		),
		children: (
			<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
				<Readout
					label="Distance"
					value="11.9"
					unit="ly"
					tone="sky"
					size="sm"
				/>
				<Readout label="ETA" value="4d 2h" tone="sky" size="sm" />
				<Readout
					label="Draw"
					value={120}
					unit="MJ"
					tone="gold"
					size="sm"
				/>
			</div>
		),
		action: (
			<div style={{ display: 'flex', gap: 8 }}>
				<Button variant="primary" size="sm">
					Confirm Jump
				</Button>
				<Button variant="tertiary" size="sm">
					Cancel
				</Button>
			</div>
		),
	},
};

/* ================================================================
 *  ScanActive — composition example
 * ============================================================= */

export const ScanActive: Story = {
	args: {
		time: 'now',
		title: 'Scanning Sol IV',
		tone: 'lilac',
		variant: 'active',
		status: (
			<StatusBadge tone="info" size="sm" pulse>
				In Progress
			</StatusBadge>
		),
		children: (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				<ProgressBar value={32} tone="lilac" size="sm" />
				<Countdown
					remaining={4320}
					tone="lilac"
					active
					label="Remaining"
					size="sm"
				/>
			</div>
		),
		action: (
			<Button variant="tertiary" size="sm">
				Cancel
			</Button>
		),
	},
};

/* ================================================================
 *  Timeline — stacked log sequence
 * ============================================================= */

export const Timeline: Story = {
	args: { time: '', title: '' },
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
			<LogCard
				time="draft"
				title="Jump to Tau Ceti"
				tone="sky"
				variant="draft"
				status={
					<StatusBadge tone="warning" size="sm">
						Pending
					</StatusBadge>
				}
				action={
					<div style={{ display: 'flex', gap: 8 }}>
						<Button variant="primary" size="sm">
							Confirm Jump
						</Button>
						<Button variant="tertiary" size="sm">
							Cancel
						</Button>
					</div>
				}
			>
				<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
					<Readout
						label="Distance"
						value="11.9"
						unit="ly"
						tone="sky"
						size="sm"
					/>
					<Readout label="ETA" value="4d 2h" tone="sky" size="sm" />
				</div>
			</LogCard>

			<LogCard
				time="now"
				title="Scanning Sol IV"
				tone="lilac"
				variant="active"
				status={
					<StatusBadge tone="info" size="sm" pulse>
						In Progress
					</StatusBadge>
				}
			>
				<div
					style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
				>
					<ProgressBar value={32} tone="lilac" size="sm" />
					<Countdown
						remaining={4320}
						tone="lilac"
						active
						label="Remaining"
						size="sm"
					/>
				</div>
			</LogCard>

			<LogCard
				time="08:42"
				title="Docked at Sol Station"
				tone="accent"
				status={
					<StatusBadge tone="success" size="sm">
						Complete
					</StatusBadge>
				}
			/>

			<LogCard
				time="06:15"
				title="Scan complete — Sol III"
				tone="lilac"
				status={
					<StatusBadge tone="success" size="sm">
						Complete
					</StatusBadge>
				}
				action={
					<Button variant="tertiary" size="sm">
						View Results
					</Button>
				}
			/>

			<LogCard
				time="02:30"
				title="Arrived in Sol"
				tone="sky"
				status={
					<StatusBadge tone="success" size="sm">
						Complete
					</StatusBadge>
				}
			/>

			<LogCard
				time="Y1 D12"
				title="Jump to Sol initiated"
				tone="sky"
				status={
					<StatusBadge tone="muted" size="sm">
						Resolved
					</StatusBadge>
				}
			/>
		</div>
	),
};
