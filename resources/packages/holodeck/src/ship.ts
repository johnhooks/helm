import type { Constants } from '@helm/formulas';
import { DEFAULT_CONSTANTS } from '@helm/formulas';
import type { Clock } from './clock';
import type { Rng } from './rng';
import type { InternalShipState } from './state';
import { createInternalState } from './state';
import type { ShipState } from './types/ship-state';
import { PowerSystem } from './systems/power';
import { PropulsionSystem } from './systems/propulsion';
import { SensorSystem } from './systems/sensors';
import { ShieldSystem } from './systems/shields';
import { HullSystem } from './systems/hull';
import { NavigationSystem } from './systems/navigation';
import { CargoSystem } from './systems/cargo';

export class Ship {
	readonly power: PowerSystem;
	readonly propulsion: PropulsionSystem;
	readonly sensors: SensorSystem;
	readonly shields: ShieldSystem;
	readonly hull: HullSystem;
	readonly navigation: NavigationSystem;
	readonly cargo: CargoSystem;

	private readonly constants: Constants;

	constructor(
		private readonly state: InternalShipState,
		private readonly clock: Clock,
		readonly rng: Rng,
		constants?: Constants,
	) {
		this.constants = constants ?? DEFAULT_CONSTANTS;
		const loadout = state.loadout;

		this.power = new PowerSystem(state, loadout);
		this.shields = new ShieldSystem(state, loadout);
		this.hull = new HullSystem(state);
		this.navigation = new NavigationSystem(state, loadout, this.constants);
		this.cargo = new CargoSystem(state);
		this.propulsion = new PropulsionSystem(
			state,
			loadout,
			this.power,
			this.constants,
		);
		this.sensors = new SensorSystem(
			state,
			loadout,
			this.power,
			this.constants,
		);
	}

	resolve(): ShipState {
		const now = this.clock.now();
		return {
			id: this.state.id,
			loadout: this.state.loadout,
			shieldPriority: this.state.shieldPriority,
			power: this.power.getCurrentPower(now),
			powerMax: this.power.getMaxPower(),
			shield: this.shields.getCurrentStrength(now),
			shieldMax: this.shields.getMaxStrength(),
			hull: this.hull.getIntegrity(),
			hullMax: this.hull.getMaxIntegrity(),
			coreLife: this.power.getCoreLife(),
			nodeId: this.navigation.getCurrentPosition(),
			cargo: { ...this.state.cargo },
			ammo: { ...this.state.ammo },
			activeEquipment: [...this.state.activeEquipment],
			pilot: { ...this.state.pilot },
			passiveScanInterval: this.state.passiveScanInterval,
			nextPassiveScanAt: this.state.nextPassiveScanAt,
		};
	}

	activateEquipment(slug: string): void {
		const hasInLoadout = this.state.loadout.equipment.some(
			(eq) => eq.product.slug === slug,
		);
		if (!hasInLoadout) {
			throw new Error(`Equipment "${slug}" not in loadout`);
		}
		this.state.activeEquipment.add(slug);
	}

	deactivateEquipment(slug: string): void {
		this.state.activeEquipment.delete(slug);
	}

	isEquipmentActive(slug: string): boolean {
		return this.state.activeEquipment.has(slug);
	}

	getActiveEquipment(): readonly string[] {
		return [...this.state.activeEquipment];
	}

	createClone(clock: Clock, rng: Rng): Ship {
		const clonedState = createInternalState(this.state.loadout, {
			id: this.state.id,
			shieldPriority: this.state.shieldPriority,
			nodeId: this.state.nodeId,
			cargo: { ...this.state.cargo },
			ammo: { ...this.state.ammo },
			hullIntegrity: this.state.hullIntegrity,
			coreLife: this.state.coreLife,
			powerFullAt: this.state.powerFullAt,
			shieldsFullAt: this.state.shieldsFullAt,
			activeEquipment: [...this.state.activeEquipment],
			pilot: { ...this.state.pilot },
			passiveScanInterval: this.state.passiveScanInterval,
			nextPassiveScanAt: this.state.nextPassiveScanAt,
		});
		return new Ship(clonedState, clock, rng, this.constants);
	}

	scheduleNextPassiveScan(completedAt: number): void {
		this.state.nextPassiveScanAt = completedAt + this.state.passiveScanInterval;
	}

	getNextPassiveScanAt(): number {
		return this.state.nextPassiveScanAt;
	}

	consumePower(amount: number): void {
		const now = this.clock.now();
		this.state.powerFullAt =
			this.power.calculatePowerFullAtAfterConsumption(amount, now);
	}

	absorbDamage(amount: number): { shieldAbsorbed: number; hullDamage: number } {
		const now = this.clock.now();
		const { absorbed, overflow } =
			this.shields.calculateDamageAbsorption(amount, now);

		if (absorbed > 0) {
			this.state.shieldsFullAt =
				this.shields.calculateShieldsFullAtAfterDamage(absorbed, now);
		}

		if (overflow > 0) {
			this.state.hullIntegrity =
				this.hull.calculateIntegrityAfterDamage(overflow);
		}

		return { shieldAbsorbed: absorbed, hullDamage: overflow };
	}

	degradeCore(amount: number): void {
		this.state.coreLife = Math.max(0, this.state.coreLife - amount);
	}

	moveToNode(nodeId: number): void {
		this.state.nodeId = nodeId;
	}

	repairHull(amount: number): void {
		this.state.hullIntegrity =
			this.hull.calculateIntegrityAfterRepair(amount);
	}

	setShieldPriority(priority: number): void {
		const now = this.clock.now();
		const currentStrength = this.shields.getCurrentStrength(now);
		this.state.shieldPriority = priority;

		if (currentStrength >= this.state.shieldsMax) {
			this.state.shieldsFullAt = null;
		} else {
			const rate = this.shields.getRegenRate();
			if (rate <= 0) {
				this.state.shieldsFullAt = Infinity;
			} else {
				const deficit = this.state.shieldsMax - currentStrength;
				const hoursToFull = deficit / rate;
				this.state.shieldsFullAt = now + hoursToFull * 3600;
			}
		}
	}

	addCargo(slug: string, quantity: number): void {
		this.state.cargo[slug] = (this.state.cargo[slug] ?? 0) + quantity;
	}

	removeCargo(slug: string, quantity: number): number {
		const current = this.state.cargo[slug] ?? 0;
		const removed = Math.min(current, quantity);
		const remaining = current - removed;
		if (remaining <= 0) {
			delete this.state.cargo[slug];
		} else {
			this.state.cargo[slug] = remaining;
		}
		return removed;
	}

	consumeAmmo(slug: string, count = 1): boolean {
		const current = this.state.ammo[slug] ?? 0;
		if (current < count) {
			return false;
		}
		const remaining = current - count;
		if (remaining <= 0) {
			delete this.state.ammo[slug];
		} else {
			this.state.ammo[slug] = remaining;
		}
		return true;
	}
}
