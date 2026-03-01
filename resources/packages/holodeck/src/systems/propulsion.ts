import {
	perfRatio,
	jumpComfortRange,
	jumpDuration,
	jumpCoreCost,
	jumpPowerCost,
	DEFAULT_CONSTANTS,
} from '@helm/formulas';
import type { Constants } from '@helm/formulas';
import type { PowerSystem } from './power';
import type { InternalShipState } from '../state';
import type { Loadout } from '../types/loadout';

export class PropulsionSystem {
	private readonly constants: Constants;
	private readonly state: InternalShipState;
	private readonly loadout: Loadout;
	private readonly power: PowerSystem;

	constructor(
		state: InternalShipState,
		loadout: Loadout,
		power: PowerSystem,
		constants?: Constants,
	) {
		this.state = state;
		this.loadout = loadout;
		this.power = power;
		this.constants = constants ?? DEFAULT_CONSTANTS;
	}

	getPerformanceRatio(): number {
		return perfRatio(this.power.getOutputMultiplier(), this.loadout.drive.product);
	}

	getComfortRange(): number {
		return jumpComfortRange(
			this.loadout.drive.product,
			this.power.getOutputMultiplier(),
			this.getPerformanceRatio(),
		);
	}

	getJumpDuration(distance: number): number {
		return jumpDuration(
			distance,
			this.loadout.drive.product,
			this.power.getOutputMultiplier(),
			this.getPerformanceRatio(),
			this.state.tuning.throttle,
			this.constants,
		);
	}

	getJumpCoreCost(distance: number): number {
		return jumpCoreCost(
			distance,
			this.loadout.core.product,
			this.loadout.drive.product,
			this.state.tuning.throttle,
			this.getComfortRange(),
		);
	}

	getJumpPowerCost(distance: number): number {
		return jumpPowerCost(distance, this.constants, this.getComfortRange());
	}

	canReach(distance: number): boolean {
		const coreCost = this.getJumpCoreCost(distance);
		return this.state.coreLife >= coreCost;
	}
}
