import type { Meta, StoryObj } from '@storybook/react-vite';
import type { SystemPlanet } from '@helm/types';
import { SystemMap } from './system-map';

const meta = {
	title: 'Components/SystemMap',
	component: SystemMap,
	parameters: {
		layout: 'padded',
		backgrounds: { default: 'dark' },
	},
} satisfies Meta<typeof SystemMap>;

export default meta;
type Story = StoryObj<typeof meta>;

function planet(
	overrides: Partial<SystemPlanet> &
		Pick<SystemPlanet, 'id' | 'orbit_index' | 'orbit_au'>
): SystemPlanet {
	return { scanned: false, ...overrides };
}

const mixedPlanets: SystemPlanet[] = [
	planet({
		id: '1',
		orbit_index: 1,
		orbit_au: 0.4,
		scanned: true,
		type: 'molten',
		name: 'Alpha I',
	}),
	planet({
		id: '2',
		orbit_index: 2,
		orbit_au: 1.0,
		scanned: true,
		type: 'terrestrial',
		name: 'Alpha II',
	}),
	planet({ id: '3', orbit_index: 3, orbit_au: 2.5, scanned: false }),
	planet({
		id: '4',
		orbit_index: 4,
		orbit_au: 5.2,
		scanned: true,
		type: 'gasGiant',
		name: 'Alpha IV',
		ringed: true,
	}),
	planet({ id: '5', orbit_index: 5, orbit_au: 12.0, scanned: false }),
];

export const Default: Story = {
	args: {
		planets: mixedPlanets,
		spectralClass: 'G',
		starName: 'Alpha Centauri',
	},
};

export const AllScanned: Story = {
	args: {
		planets: [
			planet({
				id: '1',
				orbit_index: 1,
				orbit_au: 0.3,
				scanned: true,
				type: 'molten',
				name: 'Beta I',
			}),
			planet({
				id: '2',
				orbit_index: 2,
				orbit_au: 0.8,
				scanned: true,
				type: 'desert',
				name: 'Beta II',
			}),
			planet({
				id: '3',
				orbit_index: 3,
				orbit_au: 1.2,
				scanned: true,
				type: 'ocean',
				name: 'Beta III',
			}),
		],
		spectralClass: 'K',
		starName: 'Beta Hydri',
	},
};

export const SinglePlanet: Story = {
	args: {
		planets: [
			planet({
				id: '1',
				orbit_index: 1,
				orbit_au: 0.05,
				scanned: true,
				type: 'terrestrial',
				name: 'Proxima b',
			}),
		],
		spectralClass: 'M',
		starName: 'Proxima Centauri',
	},
};

/**
 * Pulsar system — compact stellar object rendered as a small glyph.
 */
export const Pulsar: Story = {
	args: {
		planets: [
			planet({
				id: '1',
				orbit_index: 1,
				orbit_au: 0.2,
				scanned: true,
				type: 'molten',
				name: 'PSR-1257 b',
			}),
			planet({
				id: '2',
				orbit_index: 2,
				orbit_au: 0.4,
				scanned: true,
				type: 'terrestrial',
				name: 'PSR-1257 c',
			}),
			planet({
				id: '3',
				orbit_index: 3,
				orbit_au: 0.5,
				scanned: true,
				type: 'frozen',
				name: 'PSR-1257 d',
			}),
		],
		spectralClass: 'B',
		stellarType: 'pulsar',
		starName: 'PSR B1257+12',
	},
};

/**
 * Substellar companion — a brown dwarf orbiting alongside planets,
 * rendered as a smaller circle to distinguish it from planet glyphs.
 */
export const SubstellarCompanion: Story = {
	args: {
		planets: [
			planet({
				id: '1',
				orbit_index: 1,
				orbit_au: 0.3,
				scanned: true,
				type: 'molten',
				name: 'Gl 229 b',
			}),
			planet({
				id: '2',
				orbit_index: 2,
				orbit_au: 1.0,
				scanned: true,
				type: 'terrestrial',
				name: 'Gl 229 c',
			}),
			planet({
				id: '3',
				orbit_index: 3,
				orbit_au: 4.5,
				scanned: true,
				type: 'companion',
				name: 'Gl 229 B',
			}),
			planet({
				id: '4',
				orbit_index: 4,
				orbit_au: 9.0,
				scanned: true,
				type: 'gasGiant',
				name: 'Gl 229 d',
			}),
		],
		spectralClass: 'M',
		starName: 'Gliese 229 A',
	},
};
