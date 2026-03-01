import type { Product } from '@helm/types';
import type { SensorAffinity, EnvelopePhaseShape } from '@helm/formulas';

export interface TuningConfig {
	param: 'effort' | 'throttle' | 'priority';
	min: number;
	max: number;
}

export interface DriveDSP {
	spool: EnvelopePhaseShape;
	sustain: EnvelopePhaseShape;
	cooldown: EnvelopePhaseShape;
}

/**
 * Product with catalog-level data for design-time analysis.
 *
 * Extends the base Product (which the simulation uses via InstalledComponent.product)
 * with fields that live in the catalog JSON but aren't part of the runtime Product table:
 * power draw, tuning config, and DSP profiles.
 */
export interface CatalogProduct extends Product {
	draw: number | null;
	tuning: TuningConfig | null;
	sensorDsp: SensorAffinity | null;
	driveDsp: DriveDSP | null;
}
