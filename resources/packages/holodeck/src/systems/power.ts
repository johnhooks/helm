import { coreOutput, regenRate as coreRegenRate } from '@helm/formulas';
import { POWER_MODE_PROFILES } from '../enums/power-mode';
import type { InternalShipState } from '../state';
import type { Loadout } from '../types/loadout';

export class PowerSystem {
	private readonly state: InternalShipState;
	private readonly loadout: Loadout;

	constructor(state: InternalShipState, loadout: Loadout) {
		this.state = state;
		this.loadout = loadout;
	}

	/**
	 * Current power level computed from timestamp.
	 * If powerFullAt is null, ship is at max.
	 * If powerFullAt is in the past (<= now), ship is at max.
	 * Otherwise: deficit = regenRate * (fullAt - now) / 3600
	 */
	getCurrentPower(now: number): number {
		if (this.state.powerFullAt === null || this.state.powerFullAt <= now) {
			return this.state.powerMax;
		}
		const secondsUntilFull = this.state.powerFullAt - now;
		const hoursUntilFull = secondsUntilFull / 3600;
		const rate = this.getRegenRate();
		const deficit = hoursUntilFull * rate;
		return Math.max(0, this.state.powerMax - deficit);
	}

	getRegenRate(): number {
		const profile = POWER_MODE_PROFILES[this.state.powerMode];
		return coreRegenRate(this.loadout.core.product) * profile.regen;
	}

	getOutputMultiplier(): number {
		const profile = POWER_MODE_PROFILES[this.state.powerMode];
		return coreOutput(this.loadout.core.product) * profile.output;
	}

	getDecayMultiplier(): number {
		return POWER_MODE_PROFILES[this.state.powerMode].decay;
	}

	getMaxPower(): number {
		return this.state.powerMax;
	}

	hasAvailable(amount: number, now: number): boolean {
		return this.getCurrentPower(now) >= amount;
	}

	getCoreLife(): number {
		return this.state.coreLife;
	}

	isDepleted(): boolean {
		return this.state.coreLife <= 0;
	}

	/**
	 * Compute new powerFullAt after consuming an amount of power.
	 */
	calculatePowerFullAtAfterConsumption(amount: number, now: number): number | null {
		const current = this.getCurrentPower(now);
		const newPower = Math.max(0, current - amount);
		if (newPower >= this.state.powerMax) {
			return null;
		}

		const rate = this.getRegenRate();
		if (rate <= 0) {
			return Infinity;
		}

		const deficit = this.state.powerMax - newPower;
		const hoursToFull = deficit / rate;
		return now + hoursToFull * 3600;
	}
}
