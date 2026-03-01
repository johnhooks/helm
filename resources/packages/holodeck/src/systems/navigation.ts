import { discoveryProbability, DEFAULT_CONSTANTS } from '@helm/formulas';
import type { Constants } from '@helm/formulas';
import type { InternalShipState } from '../state';
import type { Loadout } from '../types/loadout';

export class NavigationSystem {
	private readonly constants: Constants;
	private readonly state: InternalShipState;
	private readonly loadout: Loadout;

	constructor(
		state: InternalShipState,
		loadout: Loadout,
		constants?: Constants,
	) {
		this.state = state;
		this.loadout = loadout;
		this.constants = constants ?? DEFAULT_CONSTANTS;
	}

	getSkill(): number {
		return this.loadout.nav.product.mult_a ?? 0;
	}

	getEfficiency(): number {
		return this.loadout.nav.product.mult_b ?? 0;
	}

	getCurrentPosition(): number | null {
		return this.state.nodeId;
	}

	getDiscoveryProbability(hopDepth: number): number {
		return discoveryProbability(
			this.getSkill(),
			this.getEfficiency(),
			hopDepth,
			this.constants.hopDecayFactor,
		);
	}
}
