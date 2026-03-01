import type { Loadout , WorkbenchProduct } from '../types';

export interface ShipState {
	/**
	 * Reference name in scenario.
	 */
	slug: string;
	/**
	 * Ship loadout (hull + 5 core components).
	 */
	loadout: Loadout;
	/**
	 * Equipped weapons and defensive gear.
	 */
	equipment: WorkbenchProduct[];
	/**
	 * Current capacitor level.
	 */
	power: number;
	/**
	 * Remaining core life (hp).
	 */
	coreLife: number;
	/**
	 * Current shield HP.
	 */
	shield: number;
	/**
	 * Hull integrity (0 = destroyed).
	 */
	hull: number;
	/**
	 * Torpedo counts by weapon slug.
	 */
	ammo: Record<string, number>;
	/**
	 * Abstract distance (ly from origin).
	 */
	position: number;
	/**
	 * Slugs of active equipment.
	 */
	activeEquipment: Set<string>;
}

export type SimEvent =
	| { type: 'jump_complete'; ship: string; distance: number; coreCost: number }
	| { type: 'scan_complete'; ship: string; success: boolean; chance: number }
	| { type: 'phaser_drain'; ship: string; target: string; shieldDrain: number }
	| { type: 'torpedo_fired'; ship: string; target: string; hit: boolean; damage: number }
	| { type: 'torpedo_intercepted'; ship: string; target: string }
	| { type: 'shield_depleted'; ship: string }
	| { type: 'ship_destroyed'; ship: string }
	| { type: 'escape'; ship: string; method: string }
	| { type: 'power_regen'; ship: string; amount: number }
	| { type: 'shield_regen'; ship: string; amount: number }
	| { type: 'equipment_activated'; ship: string; equipment: string }
	| { type: 'equipment_deactivated'; ship: string; equipment: string };

export interface SimulationSnapshot {
	/**
	 * Seconds from scenario start.
	 */
	t: number;
	/**
	 * Ship states keyed by slug.
	 */
	ships: Record<string, SerializedShipState>;
	/**
	 * Events that occurred at this tick.
	 */
	events: SimEvent[];
}

/**
 * Serialized ship state (Set → array for JSON).
 */
export interface SerializedShipState {
	slug: string;
	power: number;
	coreLife: number;
	shield: number;
	hull: number;
	ammo: Record<string, number>;
	position: number;
	activeEquipment: string[];
}
