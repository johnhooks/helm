import { shieldRegenRate } from '@helm/formulas';
import type { InternalShipState } from '../state';
import type { Loadout } from '../types/loadout';

export class ShieldSystem {
	private readonly state: InternalShipState;
	private readonly loadout: Loadout;

	constructor(state: InternalShipState, loadout: Loadout) {
		this.state = state;
		this.loadout = loadout;
	}

	/**
	 * Current shield strength computed from timestamp.
	 * Same pattern as PowerSystem: null or past = at max.
	 */
	getCurrentStrength(now: number): number {
		if (this.state.shieldsFullAt === null || this.state.shieldsFullAt <= now) {
			return this.state.shieldsMax;
		}
		const secondsUntilFull = this.state.shieldsFullAt - now;
		const hoursUntilFull = secondsUntilFull / 3600;
		const rate = this.getRegenRate();
		const deficit = hoursUntilFull * rate;
		return Math.max(0, this.state.shieldsMax - deficit);
	}

	getRegenRate(): number {
		const baseRate = this.loadout.shield.product.rate ?? 0;
		return shieldRegenRate(baseRate, this.state.tuning.priority);
	}

	getMaxStrength(): number {
		return this.state.shieldsMax;
	}

	isDepleted(now: number): boolean {
		return this.getCurrentStrength(now) <= 0;
	}

	/**
	 * Compute new shieldsFullAt after taking damage.
	 */
	calculateShieldsFullAtAfterDamage(amount: number, now: number): number | null {
		const current = this.getCurrentStrength(now);
		const newStrength = Math.max(0, current - amount);
		if (newStrength >= this.state.shieldsMax) {
			return null;
		}

		const rate = this.getRegenRate();
		if (rate <= 0) {
			return Infinity;
		}

		const deficit = this.state.shieldsMax - newStrength;
		const hoursToFull = deficit / rate;
		return now + hoursToFull * 3600;
	}

	/**
	 * Calculate how much damage shields absorb vs overflow to hull.
	 */
	calculateDamageAbsorption(
		damage: number,
		now: number,
	): { absorbed: number; overflow: number } {
		const current = this.getCurrentStrength(now);
		if (current >= damage) {
			return { absorbed: damage, overflow: 0 };
		}
		return { absorbed: current, overflow: damage - current };
	}
}
