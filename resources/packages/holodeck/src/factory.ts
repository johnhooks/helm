import type { Constants, PilotSkills } from '@helm/formulas';
import type { Clock } from './clock';
import type { Rng } from './rng';
import type { Loadout } from './types/loadout';
import { createInternalState } from './state';
import { Ship } from './ship';

export interface ShipConfig {
	id?: string;
	nodeId?: number | null;
	shieldPriority?: number;
	cargo?: Record<string, number>;
	ammo?: Record<string, number>;
	hullIntegrity?: number;
	coreLife?: number;
	powerFullAt?: number | null;
	shieldsFullAt?: number | null;
	activeEquipment?: string[];
	pilot?: Partial<PilotSkills>;
}

export function createShip(
	loadout: Loadout,
	clock: Clock,
	rng: Rng,
	config?: ShipConfig,
	constants?: Constants,
): Ship {
	const state = createInternalState(loadout, config);
	return new Ship(state, clock, rng, constants);
}
