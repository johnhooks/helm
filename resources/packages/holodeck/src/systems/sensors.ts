import {
	scanComfortRange,
	scanPowerCost,
	scanDuration,
	scanSuccessChance,
	DEFAULT_CONSTANTS,
} from '@helm/formulas';
import type { Constants, SensorAffinity } from '@helm/formulas';
import type { CatalogProduct } from '../types/catalog';
import type { PowerSystem } from './power';
import type { InternalShipState } from '../state';
import type { Loadout } from '../types/loadout';

export class SensorSystem {
	private readonly constants: Constants;
	private readonly state: InternalShipState;
	private readonly loadout: Loadout;
	private readonly power: PowerSystem;

	constructor(
		state: InternalShipState,
		loadout: Loadout,
		power: PowerSystem,
		constants?: Constants
	) {
		this.state = state;
		this.loadout = loadout;
		this.power = power;
		this.constants = constants ?? DEFAULT_CONSTANTS;
	}

	getRange(): number {
		return (
			(this.loadout.sensor.product.sustain ?? 0) *
			this.power.getOutputMultiplier()
		);
	}

	getComfortRange(): number {
		const base = scanComfortRange(
			this.loadout.sensor.product,
			this.power.getOutputMultiplier()
		);
		const hullMult = this.loadout.hull.scanComfortMultiplier ?? 1.0;
		return base * hullMult;
	}

	canScan(distance: number): boolean {
		return distance <= this.getRange();
	}

	getScanPowerCost(distance: number): number {
		return scanPowerCost(distance, this.constants, this.getComfortRange());
	}

	getScanDuration(distance: number, effort = 1.0): number {
		return scanDuration(
			distance,
			this.loadout.sensor.product,
			effort,
			this.constants
		);
	}

	getScanSuccessChance(distance: number, effort = 1.0): number {
		return scanSuccessChance(
			this.loadout.sensor.product,
			distance,
			this.getComfortRange(),
			effort,
			this.state.pilot.scanning
		);
	}

	getSensorAffinity(): SensorAffinity | null {
		return (
			(this.loadout.sensor.product as CatalogProduct).sensorDsp ?? null
		);
	}
}
