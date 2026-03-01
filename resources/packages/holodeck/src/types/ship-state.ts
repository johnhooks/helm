import type { ActionTuning } from '@helm/formulas';
import type { PowerMode } from '../enums/power-mode';
import type { Loadout } from './loadout';

export interface ShipState {
	id: string;
	loadout: Loadout;
	powerMode: PowerMode;
	power: number;
	powerMax: number;
	shield: number;
	shieldMax: number;
	hull: number;
	hullMax: number;
	coreLife: number;
	nodeId: number | null;
	tuning: ActionTuning;
	cargo: Record<string, number>;
	ammo: Record<string, number>;
}
