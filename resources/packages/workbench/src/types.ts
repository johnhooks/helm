import type { Product } from '@helm/types';
import type { ActionTuning, Constants, SensorAffinity, EnvelopePhaseShape, DriveEnvelope } from '@helm/formulas';
export { DEFAULT_CONSTANTS, DEFAULT_TUNING } from '@helm/formulas';

export type { ActionTuning, Constants };

export type ComponentType = 'core' | 'drive' | 'sensor' | 'shield' | 'nav' | 'weapon' | 'cloak' | 'equipment';

export interface TuningConfig {
	param: 'effort' | 'throttle' | 'priority';
	min: number;
	max: number;
}

/**
 * Workbench-local alias — formulas SensorAffinity without re-declaring the shape.
 */
export type SensorDSP = SensorAffinity;

/**
 * Workbench-local alias — drive envelope phases without the label.
 */
export type DriveDSP = Omit<DriveEnvelope, 'label'>;

/**
 * Re-export phase shape for product data.
 */
export type DrivePhase = EnvelopePhaseShape;

export interface WorkbenchProduct extends Product {
	draw: number | null;
	tuning: TuningConfig | null;
	sensorDsp: SensorDSP | null;
	driveDsp: DriveDSP | null;
}

export interface Hull {
	slug: string;
	label: string;
	internalSpace: number;
	slots: readonly ComponentType[];
	equipmentSlots: number;
	hullMass: number;
	hullSignature: number;
	weaponDrawMultiplier?: number;
	stealthDrawMultiplier?: number;
	amplitudeMultiplier?: number;
	spoolMultiplier?: number;
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
		breakdown: Record<string, number>;
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
	signature: {
		hullSignature: number;
		weaponDrawMultiplier: number;
		stealthDrawMultiplier: number;
	};
	mechanics: {
		transitShieldRegen: {
			regenRateInTransit: number;
			sampleJumps: { distance: number; shieldRecovered: number }[];
		} | null;
		coreResonanceScanning: {
			sampleScans: {
				distance: number;
				capacitorCost: number;
				coreDamage: number;
				scansBeforeCoreDeath: number;
			}[];
		} | null;
		sensorShieldCoupling: {
			passiveAffinityMultiplier: number;
		} | null;
	};
}
