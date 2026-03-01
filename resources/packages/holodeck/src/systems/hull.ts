import type { InternalShipState } from '../state';

export class HullSystem {
	private readonly state: InternalShipState;

	constructor(state: InternalShipState) {
		this.state = state;
	}

	getIntegrity(): number {
		return this.state.hullIntegrity;
	}

	getMaxIntegrity(): number {
		return this.state.hullMax;
	}

	getIntegrityPercent(): number {
		if (this.state.hullMax <= 0) {
			return 0;
		}
		return this.state.hullIntegrity / this.state.hullMax;
	}

	isDestroyed(): boolean {
		return this.state.hullIntegrity <= 0;
	}

	isCritical(threshold = 0.25): boolean {
		return this.getIntegrityPercent() <= threshold;
	}

	calculateIntegrityAfterDamage(amount: number): number {
		return Math.max(0, this.state.hullIntegrity - amount);
	}

	calculateIntegrityAfterRepair(amount: number): number {
		return Math.min(this.state.hullMax, this.state.hullIntegrity + amount);
	}
}
