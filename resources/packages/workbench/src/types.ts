import type { ActionTuning, Constants, PilotSkills } from '@helm/formulas';
import type { Hull, CatalogProduct } from '@helm/holodeck';
export {
	DEFAULT_CONSTANTS,
	DEFAULT_TUNING,
	DEFAULT_PILOT_SKILLS,
	PILOT_SKILL_RANGE,
} from '@helm/formulas';

export type { ActionTuning, Constants, PilotSkills };

export type { Hull };

export type {
	CatalogProduct,
	TuningConfig,
	DriveDSP,
	ComponentType,
} from '@helm/holodeck';
export type { SensorAffinity as SensorDSP } from '@helm/formulas';
export type { EnvelopePhaseShape as DrivePhase } from '@helm/formulas';

/**
 * Flat loadout for report/formula analysis.
 *
 * Unlike holodeck's Loadout (which wraps products in InstalledComponent),
 * this provides direct access to CatalogProduct fields (draw, tuning, dsp)
 * needed by computeShipReport and other analysis functions.
 */
export interface ReportLoadout {
	hull: Hull;
	core: CatalogProduct;
	drive: CatalogProduct;
	sensor: CatalogProduct;
	shield: CatalogProduct;
	nav: CatalogProduct;
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
		sampleScans: {
			distance: number;
			cost: number;
			duration: number;
			strain: number;
			chance: number;
		}[];
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
