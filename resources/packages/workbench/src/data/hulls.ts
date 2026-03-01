import type { Hull } from '../types';

export const HULLS: Hull[] = [
	{
		slug: 'pioneer',
		label: 'Pioneer Frame',
		internalSpace: 300,
		slots: ['core', 'drive', 'sensor', 'shield', 'nav'],
		equipmentSlots: 3,
		hullMass: 1.0,
		hullSignature: 1.0,
	},
	{
		slug: 'scout',
		label: 'Scout Hull',
		internalSpace: 250,
		slots: ['core', 'drive', 'sensor', 'shield', 'nav'],
		equipmentSlots: 2,
		hullMass: 0.7,
		hullSignature: 0.6,
		amplitudeMultiplier: 1.15,
	},
	{
		slug: 'surveyor',
		label: 'Surveyor Hull',
		internalSpace: 325,
		slots: ['core', 'drive', 'sensor', 'shield', 'nav'],
		equipmentSlots: 4,
		hullMass: 1.1,
		hullSignature: 1.2,
	},
	{
		slug: 'bulwark',
		label: 'Bulwark Frame',
		internalSpace: 600,
		slots: ['core', 'drive', 'sensor', 'shield', 'nav'],
		equipmentSlots: 1,
		hullMass: 1.4,
		hullSignature: 1.4,
	},
	{
		slug: 'striker',
		label: 'Striker Frame',
		internalSpace: 200,
		slots: ['core', 'drive', 'sensor', 'shield', 'nav'],
		equipmentSlots: 2,
		hullMass: 0.9,
		hullSignature: 1.3,
		weaponDrawMultiplier: 0.6,
	},
	{
		slug: 'specter',
		label: 'Specter Frame',
		internalSpace: 200,
		slots: ['core', 'drive', 'sensor', 'shield', 'nav'],
		equipmentSlots: 2,
		hullMass: 0.8,
		hullSignature: 0.5,
		stealthDrawMultiplier: 0.5,
	},
];

/**
 * Find a hull by slug.
 */
export function getHull(slug: string): Hull | undefined {
	return HULLS.find((h) => h.slug === slug);
}
