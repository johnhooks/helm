import type { PilotSkills } from '@helm/formulas';
import type { Loadout } from './loadout';

export interface ShipState {
	id: string;
	loadout: Loadout;
	shieldPriority: number;
	power: number;
	powerMax: number;
	shield: number;
	shieldMax: number;
	hull: number;
	hullMax: number;
	coreLife: number;
	nodeId: number | null;
	cargo: Record<string, number>;
	ammo: Record<string, number>;
	activeEquipment: string[];
	pilot: PilotSkills;
	passiveScanInterval: number;
	nextPassiveScanAt: number;
}
