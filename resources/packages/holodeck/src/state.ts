import type { ActionTuning } from '@helm/formulas';
import { capacitor } from '@helm/formulas';
import type { PowerMode } from './enums/power-mode';
import type { Loadout } from './types/loadout';

export interface InternalShipState {
	id: string;
	loadout: Loadout;
	powerMode: PowerMode;
	powerFullAt: number | null;
	powerMax: number;
	shieldsFullAt: number | null;
	shieldsMax: number;
	hullIntegrity: number;
	hullMax: number;
	coreLife: number;
	nodeId: number | null;
	tuning: ActionTuning;
	cargo: Record<string, number>;
	ammo: Record<string, number>;
}

export interface InternalStateConfig {
	id?: string;
	powerMode?: PowerMode;
	nodeId?: number | null;
	tuning?: Partial<ActionTuning>;
	cargo?: Record<string, number>;
	ammo?: Record<string, number>;
	hullIntegrity?: number;
	coreLife?: number;
	powerFullAt?: number | null;
	shieldsFullAt?: number | null;
}

export function createInternalState(
	loadout: Loadout,
	config?: InternalStateConfig,
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
		powerMode: config?.powerMode ?? ('normal' as PowerMode),
		powerFullAt: config?.powerFullAt ?? null,
		powerMax,
		shieldsFullAt: config?.shieldsFullAt ?? null,
		shieldsMax,
		hullIntegrity: config?.hullIntegrity ?? hullMax,
		hullMax,
		coreLife,
		nodeId: config?.nodeId ?? null,
		tuning: {
			effort: config?.tuning?.effort ?? 1.0,
			throttle: config?.tuning?.throttle ?? 1.0,
			priority: config?.tuning?.priority ?? 1.0,
		},
		cargo: config?.cargo ? { ...config.cargo } : {},
		ammo: config?.ammo ? { ...config.ammo } : {},
	};
}
