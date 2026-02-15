import type { Meta, StoryObj } from '@storybook/react-vite';
import { LogCard, StatusBadge, Countdown, Button } from '@helm/ui';

const meta = {
	title: 'Bridge/ShipLog',
	component: LogCard,
	parameters: {
		layout: 'centered',
		backgrounds: { default: 'dark' },
	},
	decorators: [
		( Story ) => (
			<div style={ { width: 380, display: 'flex', flexDirection: 'column', gap: 6 } }>
				<Story />
			</div>
		),
	],
} satisfies Meta< typeof LogCard >;

export default meta;
type Story = StoryObj< typeof meta >;

/* ================================================================
 *  Empty — no log entries
 * ============================================================= */

export const Empty: Story = {
	args: { time: '', title: '' },
	render: () => (
		<div style={ { color: 'var(--helm-ui-color-muted, #a39a88)', fontFamily: 'Antonio, sans-serif', fontSize: 12, letterSpacing: '0.06em' } }>
			No actions yet.
		</div>
	),
};

/* ================================================================
 *  Idle — completed entries only
 * ============================================================= */

export const Idle: Story = {
	args: { time: '', title: '' },
	render: () => (
		<>
			<LogCard time="08:42" title="Route Scan — Tau Ceti" tone="lilac"
				status={ <StatusBadge tone="success" size="sm">Complete</StatusBadge> }
			/>
			<LogCard time="06:15" title="Jump — Sol" tone="sky"
				status={ <StatusBadge tone="success" size="sm">Complete</StatusBadge> }
			/>
			<LogCard time="02:30" title="Route Scan — Sol" tone="lilac"
				status={ <StatusBadge tone="success" size="sm">Complete</StatusBadge> }
			/>
		</>
	),
};

/* ================================================================
 *  Active — in-progress action at top
 * ============================================================= */

export const Active: Story = {
	args: { time: '', title: '' },
	render: () => (
		<>
			<LogCard time="now" title="Route Scan — Tau Ceti" tone="lilac" variant="active"
				status={ <StatusBadge tone="info" size="sm" pulse>In Progress</StatusBadge> }
			>
				<Countdown remaining={ 4320 } tone="lilac" active label="ETA" size="sm" />
			</LogCard>

			<LogCard time="08:42" title="Jump — Sol" tone="sky"
				status={ <StatusBadge tone="success" size="sm">Complete</StatusBadge> }
			/>
			<LogCard time="06:15" title="Route Scan — Sol" tone="lilac"
				status={ <StatusBadge tone="success" size="sm">Complete</StatusBadge> }
			/>
		</>
	),
};

/* ================================================================
 *  WithDraft — draft card at top with confirm/cancel
 * ============================================================= */

export const WithDraft: Story = {
	args: { time: '', title: '' },
	render: () => (
		<>
			<LogCard time="draft" title="Jump — Tau Ceti" tone="sky" variant="draft"
				status={ <StatusBadge tone="warning" size="sm">Pending</StatusBadge> }
				action={
					<div style={ { display: 'flex', gap: 8 } }>
						<Button variant="primary" size="sm">Confirm</Button>
						<Button variant="tertiary" size="sm">Cancel</Button>
					</div>
				}
			/>

			<LogCard time="08:42" title="Route Scan — Tau Ceti" tone="lilac"
				status={ <StatusBadge tone="success" size="sm">Complete</StatusBadge> }
			/>
			<LogCard time="06:15" title="Jump — Sol" tone="sky"
				status={ <StatusBadge tone="success" size="sm">Complete</StatusBadge> }
			/>
		</>
	),
};
