import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { ContextMenu } from './context-menu';
import { LCARS_TONES } from '../../tones';

const meta = {
	title: 'Overlay/ContextMenu',
	component: ContextMenu,
	parameters: {
		layout: 'centered',
		backgrounds: { default: 'dark' },
	},
	argTypes: {
		tone: {
			control: 'select',
			options: [...LCARS_TONES],
		},
		width: { control: { type: 'number', min: 120, max: 320 } },
	},
} satisfies Meta<typeof ContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ================================================================
 *  Interactive
 * ============================================================= */

export const Default: Story = {
	args: {
		name: 'Tau Ceti',
		subtitle: 'G8.5V · 11.9 ly',
		tone: 'sky',
		width: 180,
		actions: [
			{ label: 'Scan Route', detail: '1h 12m' },
			{ label: 'Jump', detail: 'route unknown', disabled: true },
		],
	},
};

/* ================================================================
 *  Variants
 * ============================================================= */

export const Tones: Story = {
	args: { name: '', actions: [] },
	parameters: { controls: { disable: true } },
	render: () => (
		<div
			style={{
				display: 'flex',
				gap: 24,
				flexWrap: 'wrap',
				alignItems: 'flex-start',
			}}
		>
			<ContextMenu
				name="Tau Ceti"
				subtitle="G8.5V · 11.9 ly"
				tone="sky"
				actions={[
					{ label: 'Scan Route', detail: '1h 12m' },
					{ label: 'Jump', detail: 'route unknown', disabled: true },
				]}
			/>
			<ContextMenu
				name="Sol"
				subtitle="G2V · current"
				tone="accent"
				actions={[
					{ label: 'Survey', detail: '8 planets' },
					{ label: 'Dock', detail: 'Sol Station' },
				]}
			/>
			<ContextMenu
				name="Jupiter"
				subtitle="Gas Giant"
				tone="lilac"
				actions={[
					{ label: 'Scan Planet', detail: '2h 40m' },
					{ label: 'Survey Moons', detail: '4h' },
				]}
			/>
			<ContextMenu
				name="Kepler-442"
				subtitle="K1V · 1,206 ly"
				tone="gold"
				actions={[
					{ label: 'Scan Route', detail: '12h' },
					{ label: 'Jump', detail: 'route unknown', disabled: true },
				]}
			/>
			<ContextMenu
				name="Wolf 359"
				subtitle="M6.5V · 7.9 ly"
				tone="orange"
				actions={[
					{ label: 'Scan Route', detail: '1h 50m' },
					{ label: 'Jump', detail: 'route unknown', disabled: true },
				]}
			/>
			<ContextMenu
				name="Hostile Zone"
				subtitle="Caution"
				tone="danger"
				actions={[
					{ label: 'Retreat', detail: 'emergency' },
					{ label: 'Engage', detail: 'high risk' },
				]}
			/>
			<ContextMenu
				name="Unknown"
				subtitle="Signal detected"
				tone="neutral"
				actions={[
					{ label: 'Investigate', detail: '4h' },
					{ label: 'Ignore' },
				]}
			/>
		</div>
	),
};

export const DisabledActions: Story = {
	args: {
		name: 'Tau Ceti',
		subtitle: 'G8.5V · 11.9 ly',
		tone: 'sky',
		actions: [
			{ label: 'Scan Route', detail: '1h 12m' },
			{ label: 'Jump', detail: 'route unknown', disabled: true },
			{ label: 'Trade', detail: 'no dock', disabled: true },
		],
	},
};

export const ActionTones: Story = {
	args: {
		name: 'Tau Ceti',
		subtitle: 'G8.5V · scanned',
		tone: 'sky',
		actions: [
			{ label: 'Rescan Route', detail: '1h 12m' },
			{ label: 'Jump', detail: '4d 2h', tone: 'accent' },
		],
	},
};

export const AllStates: Story = {
	args: { name: '', actions: [] },
	parameters: { controls: { disable: true } },
	render: () => (
		<div
			style={{
				display: 'flex',
				gap: 24,
				flexWrap: 'wrap',
				alignItems: 'flex-start',
			}}
		>
			<div>
				<div
					style={{
						fontFamily: 'var(--helm-ui-font-family)',
						fontSize: 9,
						letterSpacing: '0.1em',
						color: '#444',
						textTransform: 'uppercase',
						marginBottom: 8,
					}}
				>
					Unscanned
				</div>
				<ContextMenu
					name="Tau Ceti"
					subtitle="G8.5V · 11.9 ly"
					tone="sky"
					actions={[
						{ label: 'Scan Route', detail: '1h 12m' },
						{
							label: 'Jump',
							detail: 'route unknown',
							disabled: true,
						},
					]}
				/>
			</div>
			<div>
				<div
					style={{
						fontFamily: 'var(--helm-ui-font-family)',
						fontSize: 9,
						letterSpacing: '0.1em',
						color: '#444',
						textTransform: 'uppercase',
						marginBottom: 8,
					}}
				>
					Scanned
				</div>
				<ContextMenu
					name="Tau Ceti"
					subtitle="G8.5V · 11.9 ly"
					tone="sky"
					actions={[
						{ label: 'Rescan Route', detail: '1h 12m' },
						{
							label: 'Jump',
							detail: '4d 2h · 32% fuel',
							tone: 'accent',
						},
					]}
				/>
			</div>
			<div>
				<div
					style={{
						fontFamily: 'var(--helm-ui-font-family)',
						fontSize: 9,
						letterSpacing: '0.1em',
						color: '#444',
						textTransform: 'uppercase',
						marginBottom: 8,
					}}
				>
					Current System
				</div>
				<ContextMenu
					name="Sol"
					subtitle="G2V · current"
					tone="accent"
					actions={[
						{ label: 'Survey', detail: '8 planets' },
						{ label: 'Dock', detail: 'Sol Station' },
					]}
				/>
			</div>
			<div>
				<div
					style={{
						fontFamily: 'var(--helm-ui-font-family)',
						fontSize: 9,
						letterSpacing: '0.1em',
						color: '#444',
						textTransform: 'uppercase',
						marginBottom: 8,
					}}
				>
					Planet
				</div>
				<ContextMenu
					name="Jupiter"
					subtitle="Gas Giant"
					tone="lilac"
					actions={[
						{ label: 'Scan Planet', detail: '2h 40m' },
						{ label: 'Survey Moons', detail: '4h' },
					]}
				/>
			</div>
		</div>
	),
};

/* ================================================================
 *  Design Documentation
 * ============================================================= */

const DOC: CSSProperties = {
	fontFamily: '"Antonio", "Helvetica Neue", Arial, sans-serif',
	color: '#f0e6d2',
	maxWidth: 640,
};

const H1: CSSProperties = {
	fontSize: 20,
	fontWeight: 700,
	letterSpacing: '0.06em',
	textTransform: 'uppercase' as const,
	margin: '0 0 4px',
	color: '#f2b654',
};
const H2: CSSProperties = {
	fontSize: 13,
	fontWeight: 700,
	letterSpacing: '0.06em',
	textTransform: 'uppercase' as const,
	margin: '24px 0 8px',
	color: '#6699cc',
};
const P: CSSProperties = {
	fontSize: 12,
	lineHeight: 1.6,
	margin: '0 0 8px',
	color: '#a39a88',
};
const CODE: CSSProperties = {
	fontFamily: 'monospace',
	fontSize: 11,
	background: '#1a1a1a',
	padding: '1px 5px',
	borderRadius: 3,
	color: '#f0e6d2',
};
const LI: CSSProperties = {
	fontSize: 12,
	lineHeight: 1.6,
	color: '#a39a88',
	marginBottom: 4,
};
const HR: CSSProperties = {
	border: 'none',
	borderTop: '1px solid #2a2a2a',
	margin: '20px 0',
};
const LABEL: CSSProperties = {
	fontFamily: '"Antonio", sans-serif',
	fontSize: 9,
	letterSpacing: '0.1em',
	color: '#444',
	textTransform: 'uppercase',
	marginBottom: 6,
};

/**
 * Design documentation rendered as a story.
 */
export const Design: Story = {
	args: { name: '', actions: [] },
	parameters: { layout: 'padded', controls: { disable: true } },
	render: () => (
		<div style={DOC}>
			<h1 style={H1}>Star Context Menu</h1>
			<p style={P}>
				A compact dropdown menu that appears when a player selects a
				star or planet on the starfield or survey view. This is the
				primary entry point for initiating actions.
			</p>

			<hr style={HR} />

			<h2 style={H2}>Interaction Flow</h2>
			<p style={P}>
				Player clicks a star/planet on the map → context menu appears →
				menu shows available actions based on game state (scanned vs
				unscanned) → selecting an action creates a draft action card in
				the activity log for confirmation.
			</p>

			<h2 style={H2}>Anatomy</h2>
			<div
				style={{
					display: 'flex',
					gap: 32,
					alignItems: 'flex-start',
					margin: '12px 0 16px',
				}}
			>
				<ContextMenu
					name="Tau Ceti"
					subtitle="G8.5V · 11.9 ly"
					tone="sky"
					actions={[
						{ label: 'Scan Route', detail: '1h 12m' },
						{
							label: 'Jump',
							detail: 'route unknown',
							disabled: true,
						},
					]}
				/>
				<div>
					<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
						<li style={LI}>
							<span style={{ color: '#6699cc' }}>Header</span> —
							target name in tone color + subtitle metadata
							(spectral class, distance, type)
						</li>
						<li style={LI}>
							<span style={{ color: '#f0e6d2' }}>Action row</span>{' '}
							— label left-aligned, detail (duration, cost,
							status) right-aligned
						</li>
						<li style={LI}>
							<span style={{ color: '#555' }}>Disabled row</span>{' '}
							— 35% opacity with explanatory detail text
						</li>
					</ul>
				</div>
			</div>

			<h2 style={H2}>Props</h2>
			<table
				style={{
					width: '100%',
					borderCollapse: 'collapse',
					fontSize: 11,
				}}
			>
				<thead>
					<tr style={{ borderBottom: '1px solid #2a2a2a' }}>
						<th
							style={{
								textAlign: 'left',
								padding: '4px 8px',
								color: '#6699cc',
								fontWeight: 700,
								letterSpacing: '0.04em',
								textTransform: 'uppercase',
							}}
						>
							Prop
						</th>
						<th
							style={{
								textAlign: 'left',
								padding: '4px 8px',
								color: '#6699cc',
								fontWeight: 700,
								letterSpacing: '0.04em',
								textTransform: 'uppercase',
							}}
						>
							Type
						</th>
						<th
							style={{
								textAlign: 'left',
								padding: '4px 8px',
								color: '#6699cc',
								fontWeight: 700,
								letterSpacing: '0.04em',
								textTransform: 'uppercase',
							}}
						>
							Description
						</th>
					</tr>
				</thead>
				<tbody>
					{[
						[
							'name',
							'string',
							'Target name displayed in the header',
						],
						[
							'subtitle',
							'string?',
							'Metadata line (spectral class, distance, type)',
						],
						[
							'tone',
							'Tone',
							'Color for the header name (sky, accent, lilac, gold, orange, danger, neutral)',
						],
						[
							'actions',
							'ContextMenuAction[]',
							'List of available actions',
						],
						['width', 'number?', 'Menu width in px (default 180)'],
					].map(([prop, type, desc]) => (
						<tr
							key={prop}
							style={{ borderBottom: '1px solid #1a1a1a' }}
						>
							<td style={{ padding: '4px 8px' }}>
								<code style={CODE}>{prop}</code>
							</td>
							<td
								style={{ padding: '4px 8px', color: '#a39a88' }}
							>
								<code style={CODE}>{type}</code>
							</td>
							<td
								style={{ padding: '4px 8px', color: '#a39a88' }}
							>
								{desc}
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<p style={{ ...P, marginTop: 8 }}>
				Each <code style={CODE}>ContextMenuAction</code> has:{' '}
				<code style={CODE}>label</code> (string),{' '}
				<code style={CODE}>detail</code> (string),{' '}
				<code style={CODE}>disabled</code> (boolean),{' '}
				<code style={CODE}>tone</code> (Tone override for label color),{' '}
				<code style={CODE}>onClick</code> (callback).
			</p>

			<h2 style={H2}>Design Decisions</h2>
			<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
				<li style={LI}>
					No LCARS frame — elbow/sidebar is for persistent widgets,
					not transient popovers
				</li>
				<li style={LI}>
					Fixed 180px width to stay compact over the map
				</li>
				<li style={LI}>
					Detail text on disabled actions explains why they are locked
					(&ldquo;route unknown&rdquo;) — redundant signals per the
					design system
				</li>
				<li style={LI}>
					Tone colors the header name only, not the container
				</li>
			</ul>

			<h2 style={H2}>Integration</h2>
			<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
				<li style={LI}>
					Use the existing <code style={CODE}>Dropdown</code> for
					positioning and dismissal
				</li>
				<li style={LI}>
					Keyboard nav: Arrow Up/Down, Home/End between enabled items;
					Enter/Space triggers
				</li>
				<li style={LI}>
					Uses <code style={CODE}>role=&quot;menu&quot;</code> /{' '}
					<code style={CODE}>role=&quot;menuitem&quot;</code> for a11y
				</li>
				<li style={LI}>
					Integrate with the <code style={CODE}>editAction</code>{' '}
					datastore slice for draft creation
				</li>
			</ul>

			<h2 style={H2}>States</h2>
			<div
				style={{
					display: 'flex',
					gap: 16,
					flexWrap: 'wrap',
					marginTop: 12,
				}}
			>
				<div>
					<div style={LABEL}>Unscanned</div>
					<ContextMenu
						name="Tau Ceti"
						subtitle="G8.5V · 11.9 ly"
						tone="sky"
						actions={[
							{ label: 'Scan Route', detail: '1h 12m' },
							{
								label: 'Jump',
								detail: 'route unknown',
								disabled: true,
							},
						]}
					/>
				</div>
				<div>
					<div style={LABEL}>Scanned</div>
					<ContextMenu
						name="Tau Ceti"
						subtitle="G8.5V · 11.9 ly"
						tone="sky"
						actions={[
							{ label: 'Rescan Route', detail: '1h 12m' },
							{ label: 'Jump', detail: '4d 2h', tone: 'accent' },
						]}
					/>
				</div>
				<div>
					<div style={LABEL}>Current System</div>
					<ContextMenu
						name="Sol"
						subtitle="G2V · current"
						tone="accent"
						actions={[
							{ label: 'Survey', detail: '8 planets' },
							{ label: 'Dock', detail: 'Sol Station' },
						]}
					/>
				</div>
				<div>
					<div style={LABEL}>Planet</div>
					<ContextMenu
						name="Jupiter"
						subtitle="Gas Giant"
						tone="lilac"
						actions={[
							{ label: 'Scan Planet', detail: '2h 40m' },
							{ label: 'Survey Moons', detail: '4h' },
						]}
					/>
				</div>
			</div>
		</div>
	),
};
