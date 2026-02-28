import type { Product } from '@helm/types';
import type { ActionTuning, Constants } from '@helm/formulas';
export { DEFAULT_CONSTANTS, DEFAULT_TUNING } from '@helm/formulas';

export type { ActionTuning, Constants };

export type ComponentType = 'core' | 'drive' | 'sensor' | 'shield' | 'nav';

export interface TuningConfig {
	param: 'effort' | 'throttle' | 'priority';
	min: number;
	max: number;
}

export interface WorkbenchProduct extends Product {
	draw: number | null;
	tuning: TuningConfig | null;
}

export interface Hull {
	slug: string;
	label: string;
	internalSpace: number;
	hullIntegrity: number;
	powerMax: number;
	shieldsMax: number;
	slots: ComponentType[];
	equipmentSlots: number;
}

export interface Loadout {
	hull: Hull;
	core: WorkbenchProduct;
	drive: WorkbenchProduct;
	sensor: WorkbenchProduct;
	shield: WorkbenchProduct;
	nav: WorkbenchProduct;
}

export interface ShipReport {
	footprint: {
		total: number;
		budget: number;
		cargo: number;
		breakdown: Record<ComponentType, number>;
	};
	power: {
		coreOutput: number;
		capacitor: number;
		perfRatio: number;
		regenRate: number;
		coreLife: number;
	};
	scan: {
		comfortRange: number;
		powerCostPerLy: number;
		durationPerLy: number;
		successChance: number;
		sampleScans: { distance: number; cost: number; duration: number; strain: number; chance: number }[];
	};
	jump: {
		comfortRange: number;
		coreCostPerLy: number;
		powerCostPerLy: number;
		sampleJumps: {
			distance: number;
			duration: number;
			coreCost: number;
			powerCost: number;
			strain: number;
		}[];
	};
	shield: {
		capacity: number;
		regenRate: number;
		draw: number;
		timeToFull: number;
	};
	nav: {
		skill: number;
		efficiency: number;
		discoveryByDepth: { depth: number; probability: number }[];
	};
}
