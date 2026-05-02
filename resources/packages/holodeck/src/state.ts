import { capacitor, DEFAULT_PILOT_SKILLS } from '@helm/formulas';
import type { PilotSkills } from '@helm/formulas';
import type { Loadout } from './types/loadout';

export interface InternalShipState {
	id: string;
	loadout: Loadout;
	shieldPriority: number;
	powerFullAt: number | null;
	powerMax: number;
	shieldsFullAt: number | null;
	shieldsMax: number;
	hullIntegrity: number;
	hullMax: number;
	coreLife: number;
	nodeId: number | null;
	cargo: Record<string, number>;
	ammo: Record<string, number>;
	activeEquipment: Set<string>;
	pilot: PilotSkills;
	passiveScanInterval: number;
	nextPassiveScanAt: number;
}

export interface InternalStateConfig {
	id?: string;
	shieldPriority?: number;
	nodeId?: number | null;
	cargo?: Record<string, number>;
	ammo?: Record<string, number>;
	hullIntegrity?: number;
	coreLife?: number;
	powerFullAt?: number | null;
	shieldsFullAt?: number | null;
	activeEquipment?: string[];
	pilot?: Partial<PilotSkills>;
	passiveScanInterval?: number;
	nextPassiveScanAt?: number;
}

export function createInternalState(
	loadout: Loadout,
	config?: InternalStateConfig
): InternalShipState {
	const powerMax = capacitor(loadout.core.product);
	const shieldsMax =
		(loadout.shield.product.capacity ?? 0) *
		(loadout.hull.shieldCapacityMultiplier ?? 1.0);
	const hullMax = loadout.hull.hullIntegrity;
	const coreLife =
		config?.coreLife ?? loadout.core.life ?? loadout.core.product.hp ?? 0;

	return {
		id: config?.id ?? 'ship-1',
		loadout,
		shieldPriority: config?.shieldPriority ?? 1.0,
		powerFullAt: config?.powerFullAt ?? null,
		powerMax,
		shieldsFullAt: config?.shieldsFullAt ?? null,
		shieldsMax,
		hullIntegrity: config?.hullIntegrity ?? hullMax,
		hullMax,
		coreLife,
		nodeId: config?.nodeId ?? null,
		cargo: config?.cargo ? { ...config.cargo } : {},
		ammo: config?.ammo ? { ...config.ammo } : {},
		activeEquipment: new Set(config?.activeEquipment ?? []),
		pilot: { ...DEFAULT_PILOT_SKILLS, ...config?.pilot },
		passiveScanInterval: config?.passiveScanInterval ?? 300,
		nextPassiveScanAt:
			config?.nextPassiveScanAt ?? config?.passiveScanInterval ?? 300,
	};
}
