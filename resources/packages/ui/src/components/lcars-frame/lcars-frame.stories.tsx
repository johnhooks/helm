import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { LcarsFrame, LcarsHeaderChip, type LcarsTab } from './lcars-frame';
import { StatusBadge } from '../status-badge';
import { Readout } from '../readout';
import { ArcIndicator } from '../arc-indicator';
import { StackIndicator } from '../stack-indicator';
import { SystemGrid, SystemCell } from '../system-grid';
import { LCARS_TONES } from '../../tones';

const meta = {
	title: 'Layout/LcarsFrame',
	component: LcarsFrame,
	parameters: {
		layout: 'centered',
		backgrounds: { default: 'dark' },
	},
	argTypes: {
		tone: {
			control: 'select',
			options: [...LCARS_TONES],
		},
	},
} satisfies Meta<typeof LcarsFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

const engineeringTabs: LcarsTab[] = [
	{
		id: 'power',
		label: 'PWR',
		subtext: '07-341',
		content: (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<Readout label="Warp Core" value={85} unit="%" tone="gold" />
				<Readout label="Impulse" value={100} unit="%" tone="gold" />
				<Readout label="Auxiliary" value={72} unit="%" tone="gold" />
			</div>
		),
	},
	{
		id: 'shields',
		label: 'SHD',
		subtext: '14-092',
		content: (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<Readout label="Forward" value={100} unit="%" tone="sky" />
				<Readout label="Aft" value={98} unit="%" tone="sky" />
				<Readout label="Port" value={100} unit="%" tone="sky" />
			</div>
		),
	},
];

export const Default: Story = {
	args: {
		title: 'Engineering',
		tone: 'gold',
		tabs: engineeringTabs,
	},
	decorators: [
		(Story) => (
			<div style={{ minWidth: 400, minHeight: 300 }}>
				<Story />
			</div>
		),
	],
};

export const WithHeaderActions: Story = {
	args: {
		title: 'Engineering',
		tone: 'gold',
		tabs: engineeringTabs,
		headerActions: (
			<LcarsHeaderChip>
				<StatusBadge tone="success">NOMINAL</StatusBadge>
			</LcarsHeaderChip>
		),
	},
	decorators: [
		(Story) => (
			<div style={{ minWidth: 400, minHeight: 300 }}>
				<Story />
			</div>
		),
	],
};

const navigationTabs: LcarsTab[] = [
	{
		id: 'route',
		label: 'RTE',
		subtext: '18-903',
		content: (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<Readout label="Destination" value="Tau Ceti" tone="sky" />
				<Readout label="Distance" value={11.9} unit="LY" tone="sky" />
				<Readout label="ETA" value="4h 32m" tone="sky" />
			</div>
		),
	},
	{
		id: 'sensors',
		label: 'SNS',
		subtext: '33-764',
		content: (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<Readout label="Range" value={50} unit="LY" tone="sky" />
				<Readout label="Contacts" value={3} tone="sky" />
			</div>
		),
	},
];

export const NavigationFrame: Story = {
	args: {
		title: 'Navigation',
		tone: 'sky',
		tabs: navigationTabs,
		headerActions: (
			<LcarsHeaderChip>
				<StatusBadge tone="info">WARP 6</StatusBadge>
			</LcarsHeaderChip>
		),
	},
	decorators: [
		(Story) => (
			<div style={{ minWidth: 400, minHeight: 300 }}>
				<Story />
			</div>
		),
	],
};

const tacticalTabs: LcarsTab[] = [
	{
		id: 'weapons',
		label: 'WPN',
		subtext: '88-201',
		content: (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<Readout label="Phasers" value={100} unit="%" tone="orange" />
				<Readout label="Torpedoes" value={12} max={12} tone="orange" />
			</div>
		),
	},
	{
		id: 'shields',
		label: 'SHD',
		subtext: '14-092',
		content: (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<Readout label="Shield Power" value={100} unit="%" tone="sky" />
				<Readout label="Modulation" value="Alpha-7" tone="sky" />
			</div>
		),
	},
];

export const TacticalFrame: Story = {
	args: {
		title: 'Tactical',
		tone: 'danger',
		tabs: tacticalTabs,
		headerActions: (
			<LcarsHeaderChip>
				<StatusBadge tone="danger" pulse>
					RED ALERT
				</StatusBadge>
			</LcarsHeaderChip>
		),
	},
	decorators: [
		(Story) => (
			<div style={{ minWidth: 400, minHeight: 300 }}>
				<Story />
			</div>
		),
	],
};

export const ControlledTabs: Story = {
	args: { title: 'Engineering', tone: 'gold', tabs: engineeringTabs },
	parameters: { controls: { disable: true } },
	render: function ControlledExample() {
		const [activeTab, setActiveTab] = useState('power');

		return (
			<div style={{ minWidth: 400, minHeight: 300 }}>
				<LcarsFrame
					title="Engineering"
					tone="gold"
					tabs={engineeringTabs}
					activeTab={activeTab}
					onTabChange={setActiveTab}
					headerActions={
						<LcarsHeaderChip>
							<StatusBadge tone="success">NOMINAL</StatusBadge>
						</LcarsHeaderChip>
					}
				/>
			</div>
		);
	},
};

export const AllTones: Story = {
	args: { title: 'Test', tone: 'gold', tabs: [] },
	parameters: { controls: { disable: true } },
	render: () => (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(2, minmax(280px, 1fr))',
				gap: 24,
			}}
		>
			<div style={{ minHeight: 200 }}>
				<LcarsFrame
					title="Gold"
					tone="gold"
					tabs={[
						{
							id: 'eng',
							label: 'ENG',
							subtext: '07-341',
							content: (
								<Readout
									label="Core"
									value={85}
									unit="%"
									tone="gold"
									size="sm"
								/>
							),
						},
						{
							id: 'aux',
							label: 'AUX',
							subtext: '12-445',
							content: (
								<Readout
									label="Aux"
									value={72}
									unit="%"
									tone="gold"
									size="sm"
								/>
							),
						},
					]}
				/>
			</div>
			<div style={{ minHeight: 200 }}>
				<LcarsFrame
					title="Sky"
					tone="sky"
					tabs={[
						{
							id: 'nav',
							label: 'NAV',
							subtext: '41-227',
							content: (
								<Readout
									label="Speed"
									value="Warp 6"
									tone="sky"
									size="sm"
								/>
							),
						},
						{
							id: 'map',
							label: 'MAP',
							subtext: '55-118',
							content: (
								<Readout
									label="Sector"
									value="Alpha"
									tone="sky"
									size="sm"
								/>
							),
						},
					]}
				/>
			</div>
			<div style={{ minHeight: 200 }}>
				<LcarsFrame
					title="Accent"
					tone="accent"
					tabs={[
						{
							id: 'ops',
							label: 'OPS',
							subtext: '31-847',
							content: (
								<Readout
									label="Crew"
									value={430}
									tone="accent"
									size="sm"
								/>
							),
						},
						{
							id: 'com',
							label: 'COM',
							subtext: '77-201',
							content: (
								<Readout
									label="Channels"
									value={12}
									tone="accent"
									size="sm"
								/>
							),
						},
					]}
				/>
			</div>
			<div style={{ minHeight: 200 }}>
				<LcarsFrame
					title="Danger"
					tone="danger"
					tabs={[
						{
							id: 'tac',
							label: 'TAC',
							subtext: '88-201',
							content: (
								<Readout
									label="Weapons"
									value="Armed"
									tone="orange"
									size="sm"
								/>
							),
						},
						{
							id: 'def',
							label: 'DEF',
							subtext: '14-092',
							content: (
								<Readout
									label="Shields"
									value="100%"
									tone="orange"
									size="sm"
								/>
							),
						},
					]}
				/>
			</div>
		</div>
	),
};

export const CompactVsExpanded: Story = {
	args: { title: 'Test', tone: 'gold', tabs: [] },
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
			<div>
				<div
					style={{
						color: '#666',
						fontSize: 11,
						marginBottom: 8,
						fontFamily: 'Antonio, sans-serif',
						letterSpacing: '0.1em',
					}}
				>
					COMPACT (under 600px)
				</div>
				<div style={{ width: 320, minHeight: 180 }}>
					<LcarsFrame
						title="Engineering"
						tone="gold"
						tabs={[
							{
								id: 'pwr',
								label: 'PWR',
								content: (
									<Readout
										label="Core"
										value={85}
										unit="%"
										tone="gold"
										size="sm"
									/>
								),
							},
							{
								id: 'shd',
								label: 'SHD',
								content: (
									<Readout
										label="Shields"
										value={100}
										unit="%"
										tone="gold"
										size="sm"
									/>
								),
							},
						]}
					/>
				</div>
			</div>

			<div>
				<div
					style={{
						color: '#666',
						fontSize: 11,
						marginBottom: 8,
						fontFamily: 'Antonio, sans-serif',
						letterSpacing: '0.1em',
					}}
				>
					EXPANDED (600px+)
				</div>
				<div style={{ width: 700, minHeight: 220 }}>
					<LcarsFrame
						title="Engineering"
						tone="gold"
						tabs={[
							{
								id: 'power',
								label: 'Power',
								content: (
									<Readout
										label="Warp Core"
										value={85}
										unit="%"
										tone="gold"
									/>
								),
							},
							{
								id: 'shields',
								label: 'Shields',
								content: (
									<Readout
										label="Shield Power"
										value={100}
										unit="%"
										tone="gold"
									/>
								),
							},
						]}
						headerActions={
							<LcarsHeaderChip>
								<StatusBadge tone="success">
									NOMINAL
								</StatusBadge>
							</LcarsHeaderChip>
						}
					/>
				</div>
			</div>
		</div>
	),
};

const systemsOverviewTabs: LcarsTab[] = [
	{
		id: 'eng',
		label: 'ENG',
		subtext: '07-341',
		content: (
			<SystemGrid columns={2}>
				<SystemCell
					indicator={
						<ArcIndicator level={85} tone="gold" size="lg" />
					}
				>
					<Readout
						label="Warp Core"
						value={85}
						unit="%"
						tone="gold"
						size="sm"
					/>
				</SystemCell>
				<SystemCell
					indicator={
						<ArcIndicator level={100} tone="gold" size="lg" />
					}
				>
					<Readout
						label="Impulse"
						value={100}
						unit="%"
						tone="gold"
						size="sm"
					/>
				</SystemCell>
			</SystemGrid>
		),
	},
	{
		id: 'tac',
		label: 'TAC',
		subtext: '88-201',
		content: (
			<SystemGrid columns={2}>
				<SystemCell
					indicator={
						<StackIndicator
							level={100}
							segments={5}
							tone="orange"
							size="lg"
						/>
					}
				>
					<Readout
						label="Phasers"
						value={100}
						unit="%"
						tone="orange"
						size="sm"
					/>
				</SystemCell>
				<SystemCell
					indicator={
						<StackIndicator
							level={100}
							segments={5}
							tone="orange"
							size="lg"
						/>
					}
				>
					<Readout
						label="Torpedoes"
						value={12}
						max={12}
						tone="orange"
						size="sm"
					/>
				</SystemCell>
			</SystemGrid>
		),
	},
	{
		id: 'nav',
		label: 'NAV',
		subtext: '41-227',
		content: (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<Readout label="Destination" value="Tau Ceti" tone="sky" />
				<Readout label="Distance" value={11.9} unit="LY" tone="sky" />
				<Readout label="ETA" value="4h 32m" tone="sky" />
			</div>
		),
	},
	{
		id: 'sci',
		label: 'SCI',
		subtext: '62-508',
		content: (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<Readout label="Sensors" value="Active" tone="lilac" />
				<Readout label="Range" value={50} unit="LY" tone="lilac" />
			</div>
		),
	},
	{
		id: 'ops',
		label: 'OPS',
		subtext: '31-847',
		content: (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<Readout label="Crew" value={430} tone="accent" />
				<Readout
					label="Life Support"
					value={100}
					unit="%"
					tone="accent"
				/>
			</div>
		),
	},
	{
		id: 'med',
		label: 'MED',
		subtext: '19-623',
		content: (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<Readout label="Sickbay" value="Ready" tone="gold" />
				<Readout label="Patients" value={0} tone="gold" />
			</div>
		),
	},
];

export const LargeContent: Story = {
	args: {
		title: 'Systems Overview',
		tone: 'gold',
		tabs: systemsOverviewTabs,
	},
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ width: 800, height: 400 }}>
			<LcarsFrame
				title="Systems Overview"
				tone="gold"
				tabs={systemsOverviewTabs}
				headerActions={
					<LcarsHeaderChip>
						<StatusBadge tone="success">ALL SYS</StatusBadge>
					</LcarsHeaderChip>
				}
				style={{ height: '100%' }}
			/>
		</div>
	),
};

export const ManyTabs: Story = {
	args: { title: 'Many Tabs', tone: 'lilac', tabs: [] },
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ width: 500, height: 500 }}>
			<LcarsFrame
				title="Many Tabs"
				tone="lilac"
				tabs={[
					{
						id: 'a',
						label: 'ALPHA',
						subtext: '01-001',
						content: (
							<div style={{ color: '#999' }}>Alpha content</div>
						),
					},
					{
						id: 'b',
						label: 'BETA',
						subtext: '02-002',
						content: (
							<div style={{ color: '#999' }}>Beta content</div>
						),
					},
					{
						id: 'c',
						label: 'GAMMA',
						subtext: '03-003',
						content: (
							<div style={{ color: '#999' }}>Gamma content</div>
						),
					},
					{
						id: 'd',
						label: 'DELTA',
						subtext: '04-004',
						content: (
							<div style={{ color: '#999' }}>Delta content</div>
						),
					},
					{
						id: 'e',
						label: 'EPSILON',
						subtext: '05-005',
						content: (
							<div style={{ color: '#999' }}>Epsilon content</div>
						),
					},
					{
						id: 'f',
						label: 'ZETA',
						subtext: '06-006',
						content: (
							<div style={{ color: '#999' }}>Zeta content</div>
						),
					},
					{
						id: 'g',
						label: 'ETA',
						subtext: '07-007',
						content: (
							<div style={{ color: '#999' }}>Eta content</div>
						),
					},
					{
						id: 'h',
						label: 'THETA',
						subtext: '08-008',
						content: (
							<div style={{ color: '#999' }}>Theta content</div>
						),
					},
				]}
				style={{ height: '100%' }}
			/>
		</div>
	),
};
