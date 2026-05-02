import type { Meta, StoryObj } from '@storybook/react-vite';
import type { SystemContents, SystemPlanet } from '@helm/types';
import { SystemView } from './system-view';

const meta = {
	title: 'Stellar/SystemView',
	component: SystemView,
	parameters: {
		layout: 'fullscreen',
		backgrounds: { default: 'dark' },
	},
} satisfies Meta<typeof SystemView>;

export default meta;
type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

function planet(
	overrides: Partial<SystemPlanet> &
		Pick<SystemPlanet, 'id' | 'orbit_index' | 'orbit_au'>
): SystemPlanet {
	return { scanned: false, ...overrides };
}

const solSystem: SystemContents = {
	node_id: 1,
	star_name: 'Sol',
	spectral_class: 'G',
	body_count: 8,
	planets: [
		planet({
			id: 'p1',
			orbit_index: 1,
			orbit_au: 0.4,
			scanned: true,
			type: 'molten',
			name: 'Mercury',
		}),
		planet({
			id: 'p2',
			orbit_index: 2,
			orbit_au: 0.7,
			scanned: true,
			type: 'toxic',
			name: 'Venus',
		}),
		planet({
			id: 'p3',
			orbit_index: 3,
			orbit_au: 1.0,
			scanned: true,
			type: 'terrestrial',
			name: 'Earth',
		}),
		planet({ id: 'p4', orbit_index: 4, orbit_au: 1.5, scanned: false }),
		planet({
			id: 'p5',
			orbit_index: 5,
			orbit_au: 5.2,
			scanned: true,
			type: 'gasGiant',
			name: 'Jupiter',
			ringed: false,
		}),
		planet({
			id: 'p6',
			orbit_index: 6,
			orbit_au: 9.5,
			scanned: true,
			type: 'gasGiant',
			name: 'Saturn',
			ringed: true,
		}),
		planet({ id: 'p7', orbit_index: 7, orbit_au: 19.2, scanned: false }),
		planet({ id: 'p8', orbit_index: 8, orbit_au: 30.1, scanned: false }),
	],
};

const smallSystem: SystemContents = {
	node_id: 2,
	star_name: 'Proxima Centauri',
	spectral_class: 'M',
	body_count: 3,
	planets: [
		planet({
			id: 's1',
			orbit_index: 1,
			orbit_au: 0.05,
			scanned: true,
			type: 'molten',
			name: 'Proxima b',
		}),
		planet({
			id: 's2',
			orbit_index: 2,
			orbit_au: 0.3,
			scanned: true,
			type: 'terrestrial',
			name: 'Proxima c',
		}),
		planet({
			id: 's3',
			orbit_index: 3,
			orbit_au: 1.5,
			scanned: true,
			type: 'frozen',
			name: 'Proxima d',
		}),
	],
};

const largeSystem: SystemContents = {
	node_id: 3,
	star_name: 'Kepler-90',
	spectral_class: 'F',
	body_count: 12,
	planets: [
		planet({
			id: 'k1',
			orbit_index: 1,
			orbit_au: 0.1,
			scanned: true,
			type: 'molten',
			name: 'Kepler-90 b',
		}),
		planet({
			id: 'k2',
			orbit_index: 2,
			orbit_au: 0.2,
			scanned: true,
			type: 'molten',
			name: 'Kepler-90 c',
		}),
		planet({
			id: 'k3',
			orbit_index: 3,
			orbit_au: 0.4,
			scanned: true,
			type: 'desert',
			name: 'Kepler-90 d',
		}),
		planet({
			id: 'k4',
			orbit_index: 4,
			orbit_au: 0.7,
			scanned: true,
			type: 'toxic',
			name: 'Kepler-90 e',
		}),
		planet({
			id: 'k5',
			orbit_index: 5,
			orbit_au: 1.0,
			scanned: true,
			type: 'terrestrial',
			name: 'Kepler-90 f',
		}),
		planet({
			id: 'k6',
			orbit_index: 6,
			orbit_au: 1.4,
			scanned: true,
			type: 'superEarth',
			name: 'Kepler-90 g',
		}),
		planet({
			id: 'k7',
			orbit_index: 7,
			orbit_au: 2.5,
			scanned: true,
			type: 'ocean',
			name: 'Kepler-90 h',
		}),
		planet({
			id: 'k8',
			orbit_index: 8,
			orbit_au: 4.0,
			scanned: true,
			type: 'iceGiant',
			name: 'Kepler-90 i',
		}),
		planet({
			id: 'k9',
			orbit_index: 9,
			orbit_au: 7.5,
			scanned: true,
			type: 'gasGiant',
			name: 'Kepler-90 j',
			ringed: true,
		}),
		planet({
			id: 'k10',
			orbit_index: 10,
			orbit_au: 12.0,
			scanned: true,
			type: 'hotJupiter',
			name: 'Kepler-90 k',
		}),
		planet({
			id: 'k11',
			orbit_index: 11,
			orbit_au: 20.0,
			scanned: true,
			type: 'iceGiant',
			name: 'Kepler-90 l',
		}),
		planet({
			id: 'k12',
			orbit_index: 12,
			orbit_au: 35.0,
			scanned: true,
			type: 'dwarf',
			name: 'Kepler-90 m',
		}),
	],
};

const allScannedSystem: SystemContents = {
	node_id: 4,
	star_name: 'Tau Ceti',
	spectral_class: 'G',
	body_count: 5,
	planets: [
		planet({
			id: 't1',
			orbit_index: 1,
			orbit_au: 0.5,
			scanned: true,
			type: 'desert',
			name: 'Tau Ceti b',
		}),
		planet({
			id: 't2',
			orbit_index: 2,
			orbit_au: 0.8,
			scanned: true,
			type: 'terrestrial',
			name: 'Tau Ceti c',
		}),
		planet({
			id: 't3',
			orbit_index: 3,
			orbit_au: 1.3,
			scanned: true,
			type: 'superEarth',
			name: 'Tau Ceti d',
		}),
		planet({
			id: 't4',
			orbit_index: 4,
			orbit_au: 3.6,
			scanned: true,
			type: 'iceGiant',
			name: 'Tau Ceti e',
			ringed: true,
		}),
		planet({
			id: 't5',
			orbit_index: 5,
			orbit_au: 8.0,
			scanned: true,
			type: 'frozen',
			name: 'Tau Ceti f',
		}),
	],
};

const unscannedSystem: SystemContents = {
	node_id: 5,
	star_name: "Barnard's Star",
	spectral_class: 'M',
	body_count: 6,
	planets: [
		planet({ id: 'b1', orbit_index: 1, orbit_au: 0.2 }),
		planet({ id: 'b2', orbit_index: 2, orbit_au: 0.6 }),
		planet({ id: 'b3', orbit_index: 3, orbit_au: 1.1 }),
		planet({ id: 'b4', orbit_index: 4, orbit_au: 2.8 }),
		planet({ id: 'b5', orbit_index: 5, orbit_au: 6.0 }),
		planet({ id: 'b6', orbit_index: 6, orbit_au: 14.0 }),
	],
};

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

const viewportDecorator = (height = 300): Story['decorators'] => [
	(StoryFn) => (
		<div style={{ height, background: 'var(--helm-ui-color-bg, #0a0a0a)' }}>
			<StoryFn />
		</div>
	),
];

/**
 * Default — Sol system with a mix of scanned and unscanned planets.
 */
export const Default: Story = {
	args: { system: solSystem },
	decorators: viewportDecorator(),
};

/**
 * Small system — 3 planets showing how extra space distributes (glyphs stay same size).
 */
export const SmallSystem: Story = {
	args: { system: smallSystem },
	decorators: viewportDecorator(),
};

/**
 * Large system — 12 bodies showing horizontal scroll behavior.
 */
export const LargeSystem: Story = {
	args: { system: largeSystem },
	decorators: viewportDecorator(),
};

/**
 * All scanned — fully surveyed system.
 */
export const AllScanned: Story = {
	args: { system: allScannedSystem },
	decorators: viewportDecorator(),
};

/**
 * Unscanned — just arrived, all planets are "???".
 */
export const Unscanned: Story = {
	args: { system: unscannedSystem },
	decorators: viewportDecorator(),
};

/**
 * Narrow viewport — constrained width to demonstrate horizontal scroll.
 */
export const NarrowViewport: Story = {
	args: { system: solSystem },
	decorators: [
		(StoryFn) => (
			<div
				style={{
					width: 400,
					height: 300,
					background: 'var(--helm-ui-color-bg, #0a0a0a)',
					border: '1px solid var(--helm-ui-color-border, #2a2a2a)',
				}}
			>
				<StoryFn />
			</div>
		),
	],
};
