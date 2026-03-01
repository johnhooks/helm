import type { InternalShipState } from '../state';

export class CargoSystem {
	private readonly state: InternalShipState;

	constructor(state: InternalShipState) {
		this.state = state;
	}

	quantity(slug: string): number {
		return this.state.cargo[slug] ?? 0;
	}

	all(): Record<string, number> {
		return { ...this.state.cargo };
	}

	total(): number {
		let sum = 0;
		for (const qty of Object.values(this.state.cargo)) {
			sum += qty;
		}
		return sum;
	}

	has(slug: string, qty = 1): boolean {
		return this.quantity(slug) >= qty;
	}

	isEmpty(): boolean {
		return this.total() === 0;
	}

	ammoCount(slug: string): number {
		return this.state.ammo[slug] ?? 0;
	}

	allAmmo(): Record<string, number> {
		return { ...this.state.ammo };
	}
}
