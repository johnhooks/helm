import type { Hull } from '../types';

export const HULLS: Hull[] = [
	{
		slug: 'pioneer',
		label: 'Pioneer Frame',
		internalSpace: 300,
		hullIntegrity: 100,
		powerMax: 100,
		shieldsMax: 100,
		slots: ['core', 'drive', 'sensor', 'shield', 'nav'],
		equipmentSlots: 3,
	},
	{
		slug: 'scout',
		label: 'Scout Hull',
		internalSpace: 250,
		hullIntegrity: 75,
		powerMax: 80,
		shieldsMax: 75,
		slots: ['core', 'drive', 'sensor', 'shield', 'nav'],
		equipmentSlots: 2,
	},
	{
		slug: 'surveyor',
		label: 'Surveyor Hull',
		internalSpace: 325,
		hullIntegrity: 100,
		powerMax: 100,
		shieldsMax: 100,
		slots: ['core', 'drive', 'sensor', 'shield', 'nav'],
		equipmentSlots: 3,
	},
	{
		slug: 'combat',
		label: 'Combat Hull',
		internalSpace: 350,
		hullIntegrity: 200,
		powerMax: 120,
		shieldsMax: 150,
		slots: ['core', 'drive', 'sensor', 'shield', 'nav'],
		equipmentSlots: 2,
	},
];
