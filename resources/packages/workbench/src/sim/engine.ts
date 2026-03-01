/**
 * Simulation engine — steps through action sequences to model gameplay.
 *
 * Core loop:
 * 1. Initialize ShipState per ship from scenario loadouts
 * 2. Sort actions by t
 * 3. For each action, advance time (apply regen/drain), then execute
 * 4. Record snapshots and events
 * 5. Return full timeline
 */

import {
	coreOutput, regenRate, capacitor,
	jumpComfortRange, jumpCoreCost, jumpPowerCost,
	scanPowerCost, scanComfortRange, scanSuccessChance,
	shieldRegenRate, shieldDraw,
	perfRatio,
	phaserDraw, phaserShieldDrain, phaserHullDamage,
	torpedoHitChance, torpedoDamage,
	pdsInterception, ecmLockDegradation,
	shieldAbsorption,
	DEFAULT_DSP_CONSTANTS,
 DEFAULT_CONSTANTS, DEFAULT_TUNING } from '@helm/formulas';
import type { Constants, ActionTuning } from '@helm/formulas';

import type { ReportLoadout, CatalogProduct } from '../types';
import { getProduct } from '../data/products';
import { getHull } from '../data/hulls';
import type { ShipState, SimEvent, SimulationSnapshot, SerializedShipState } from './state';
import type { Scenario, SimAction } from './types';

// ── Initialization ──────────────────────────────────────────

function initShipState(slug: string, loadout: ReportLoadout, equipment: CatalogProduct[], _tuning: ActionTuning): ShipState {
	const cap = capacitor(loadout.core);
	const shieldMult = loadout.hull.shieldCapacityMultiplier ?? 1.0;
	const shieldCap = (loadout.shield.capacity ?? 0) * shieldMult;

	const ammo: Record<string, number> = {};
	for (const eq of equipment) {
		if (eq.type === 'weapon' && eq.capacity) {
			ammo[eq.slug] = eq.capacity;
		}
	}

	return {
		slug,
		loadout,
		equipment,
		power: cap,
		coreLife: loadout.core.hp ?? 0,
		shield: shieldCap,
		hull: loadout.hull.hullIntegrity,
		ammo,
		position: 0,
		activeEquipment: new Set(),
	};
}

function hydrateScenarioShip(spec: Scenario['ships'][string]): { loadout: ReportLoadout; equipment: CatalogProduct[]; tuning: ActionTuning } {
	const hull = getHull(spec.hull);
	if (!hull) {throw new Error(`Unknown hull: ${spec.hull}`);}

	const resolve = (slug: string) => {
		const p = getProduct(slug);
		if (!p) {throw new Error(`Unknown product: ${slug}`);}
		return p;
	};

	const loadout: ReportLoadout = {
		hull,
		core: resolve(spec.core),
		drive: resolve(spec.drive),
		sensor: resolve(spec.sensor),
		shield: resolve(spec.shield),
		nav: resolve(spec.nav),
	};

	const equipment = (spec.equipment ?? []).map(resolve);
	const tuning: ActionTuning = { ...DEFAULT_TUNING, ...(spec.tuning ?? {}) };

	return { loadout, equipment, tuning };
}

// ── Time advancement ────────────────────────────────────────

function advanceTime(
	ship: ShipState,
	elapsed: number,
	tuning: ActionTuning,
	_constants: Constants,
	events: SimEvent[],
): void {
	if (elapsed <= 0) {return;}

	const elapsedHours = elapsed / 3600;

	// Power regen
	const regen = regenRate(ship.loadout.core);
	const cap = capacitor(ship.loadout.core);
	const powerGain = regen * elapsedHours;
	if (powerGain > 0) {
		const before = ship.power;
		ship.power = Math.min(cap, ship.power + powerGain);
		const actual = ship.power - before;
		if (actual > 0.001) {
			events.push({ type: 'power_regen', ship: ship.slug, amount: actual });
		}
	}

	// Equipment power draws
	let totalEquipDraw = 0;
	for (const eq of ship.equipment) {
		if (ship.activeEquipment.has(eq.slug) && eq.draw) {
			totalEquipDraw += eq.draw;
		}
	}
	ship.power = Math.max(0, ship.power - totalEquipDraw * elapsedHours);

	// Shield regen
	const shieldMult = ship.loadout.hull.shieldCapacityMultiplier ?? 1.0;
	const shieldCap = (ship.loadout.shield.capacity ?? 0) * shieldMult;
	const shieldRate = shieldRegenRate(ship.loadout.shield.rate ?? 0, tuning.priority);
	const shieldGain = shieldRate * elapsedHours;
	if (shieldGain > 0 && ship.shield < shieldCap) {
		const before = ship.shield;
		ship.shield = Math.min(shieldCap, ship.shield + shieldGain);
		const actual = ship.shield - before;
		if (actual > 0.001) {
			events.push({ type: 'shield_regen', ship: ship.slug, amount: actual });
		}
	}

	// Shield draw
	const shieldDrawVal = shieldDraw(ship.loadout.shield.draw ?? 0, tuning.priority);
	ship.power = Math.max(0, ship.power - shieldDrawVal * elapsedHours);

	// Clamp
	ship.power = Math.min(cap, Math.max(0, ship.power));
}

// ── Action execution ────────────────────────────────────────

function executeAction(
	action: SimAction,
	ships: Record<string, ShipState>,
	tunings: Record<string, ActionTuning>,
	constants: Constants,
	events: SimEvent[],
): void {
	const ship = ships[action.ship];
	if (!ship || ship.hull <= 0) {return;}

	const tuning = tunings[action.ship] ?? DEFAULT_TUNING;

	switch (action.type) {
		case 'jump': {
			const distance = (action.params?.distance as number) ?? 1;
			const output = coreOutput(ship.loadout.core);
			const ratio = perfRatio(output, ship.loadout.drive);
			const comfort = jumpComfortRange(ship.loadout.drive, output, ratio) / ship.loadout.hull.hullMass;
			const coreCost = jumpCoreCost(distance, ship.loadout.core, ship.loadout.drive, tuning.throttle, comfort);
			const powerCost = jumpPowerCost(distance, constants, comfort);

			ship.coreLife = Math.max(0, ship.coreLife - coreCost);
			ship.power = Math.max(0, ship.power - powerCost);
			ship.position += distance;

			events.push({ type: 'jump_complete', ship: ship.slug, distance, coreCost });
			break;
		}

		case 'scan': {
			const distance = (action.params?.distance as number) ?? 1;
			const output = coreOutput(ship.loadout.core);
			const comfort = scanComfortRange(ship.loadout.sensor, output);
			const cost = scanPowerCost(distance, constants, comfort);
			const chance = scanSuccessChance(ship.loadout.sensor, distance, comfort, tuning.effort);

			ship.power = Math.max(0, ship.power - cost);
			const success = Math.random() < chance;

			events.push({ type: 'scan_complete', ship: ship.slug, success, chance });
			break;
		}

		case 'fire_phaser': {
			const targetSlug = action.params?.target as string;
			const target = ships[targetSlug];
			if (!target || target.hull <= 0) {break;}

			const phaser = ship.equipment.find((e) => e.slug === 'phaser_array');
			if (!phaser) {break;}

			const weaponMult = ship.loadout.hull.weaponDrawMultiplier ?? 1.0;
			const draw = phaserDraw(phaser.draw ?? 0, weaponMult);
			const duration = (action.params?.duration as number) ?? 3600; // default 1 hour of firing
			const durationHours = duration / 3600;

			// Power cost for firing
			ship.power = Math.max(0, ship.power - draw * durationHours);

			// Shield drain
			const drainRate = phaserShieldDrain(phaser.mult_a ?? 0, tuning.priority);
			let totalDrain = drainRate * durationHours;

			// Apply ECM if target has it active
			const targetEcm = target.equipment.find((e) => e.slug === 'ecm_mk1');
			if (targetEcm && target.activeEquipment.has('ecm_mk1')) {
				const degradation = ecmLockDegradation(targetEcm.mult_a ?? 0);
				totalDrain *= (1 - degradation);
			}

			const beforeShield = target.shield;
			target.shield = Math.max(0, target.shield - totalDrain);
			const actualDrain = beforeShield - target.shield;

			// Hull damage overflow — when shields are down, phasers burn hull
			let hullDmg = 0;
			const hullDamageMult = DEFAULT_DSP_CONSTANTS.phaserHullDamageMult;
			if (beforeShield <= 0) {
				// Shields were already down — full duration hits hull
				const hullDmgRate = phaserHullDamage(phaser.mult_a ?? 0, tuning.priority, hullDamageMult);
				hullDmg = hullDmgRate * durationHours;
			} else if (target.shield <= 0) {
				// Shields depleted mid-burst — remaining time hits hull
				const shieldDepletionFraction = beforeShield / totalDrain;
				const remainingHours = durationHours * (1 - shieldDepletionFraction);
				const hullDmgRate = phaserHullDamage(phaser.mult_a ?? 0, tuning.priority, hullDamageMult);
				hullDmg = hullDmgRate * remainingHours;
			}

			if (hullDmg > 0) {
				target.hull = Math.max(0, target.hull - hullDmg);
			}

			events.push({ type: 'phaser_drain', ship: ship.slug, target: targetSlug, shieldDrain: actualDrain, hullDamage: hullDmg > 0 ? hullDmg : undefined });

			if (target.shield <= 0 && beforeShield > 0) {
				events.push({ type: 'shield_depleted', ship: targetSlug });
			}

			if (target.hull <= 0 && hullDmg > 0) {
				target.hull = 0;
				events.push({ type: 'ship_destroyed', ship: targetSlug });
			}
			break;
		}

		case 'fire_torpedo': {
			const targetSlug = action.params?.target as string;
			const target = ships[targetSlug];
			if (!target || target.hull <= 0) {break;}

			const launcher = ship.equipment.find((e) => e.slug === 'torpedo_launcher');
			if (!launcher) {break;}
			if ((ship.ammo.torpedo_launcher ?? 0) <= 0) {break;}

			ship.ammo.torpedo_launcher--;

			// Compute hit chance
			const baseAccuracy = launcher.mult_b ?? 0.7;
			let ecmReduction = 0;
			const targetEcm = target.equipment.find((e) => e.slug === 'ecm_mk1');
			if (targetEcm && target.activeEquipment.has('ecm_mk1')) {
				ecmReduction = ecmLockDegradation(targetEcm.mult_a ?? 0);
			}

			// PDS check
			let pdsChance = 0;
			const targetPds = target.equipment.find((e) => e.slug === 'pds_mk1');
			if (targetPds && target.activeEquipment.has('pds_mk1')) {
				pdsChance = pdsInterception(targetPds.mult_a ?? 0, 1);
			}

			// Check PDS interception first
			if (pdsChance > 0 && Math.random() < pdsChance) {
				events.push({ type: 'torpedo_intercepted', ship: ship.slug, target: targetSlug });
				break;
			}

			const hitChance = torpedoHitChance(baseAccuracy, ecmReduction, 0); // PDS already handled
			const hit = Math.random() < hitChance;
			const payload = torpedoDamage(launcher.mult_a ?? 0);

			if (hit) {
				const { shieldDamage, hullDamage } = shieldAbsorption(payload, target.shield);
				target.shield -= shieldDamage;
				target.hull -= hullDamage;

				if (target.shield <= 0 && shieldDamage > 0) {
					events.push({ type: 'shield_depleted', ship: targetSlug });
				}

				events.push({ type: 'torpedo_fired', ship: ship.slug, target: targetSlug, hit: true, damage: payload });

				if (target.hull <= 0) {
					target.hull = 0;
					events.push({ type: 'ship_destroyed', ship: targetSlug });
				}
			} else {
				events.push({ type: 'torpedo_fired', ship: ship.slug, target: targetSlug, hit: false, damage: 0 });
			}
			break;
		}

		case 'activate_pds':
		case 'activate_ecm':
		case 'activate_veil': {
			const slugMap: Record<string, string> = {
				activate_pds: 'pds_mk1',
				activate_ecm: 'ecm_mk1',
				activate_veil: 'veil_array',
			};
			const eqSlug = slugMap[action.type];
			if (ship.equipment.some((e) => e.slug === eqSlug)) {
				ship.activeEquipment.add(eqSlug);
				events.push({ type: 'equipment_activated', ship: ship.slug, equipment: eqSlug });
			}
			break;
		}

		case 'deactivate': {
			const eqSlug = action.params?.equipment as string;
			if (eqSlug && ship.activeEquipment.has(eqSlug)) {
				ship.activeEquipment.delete(eqSlug);
				events.push({ type: 'equipment_deactivated', ship: ship.slug, equipment: eqSlug });
			}
			break;
		}

		case 'wait':
			// No-op — time advancement handles regen/drain
			break;

		case 'mine':
			// Placeholder — mining doesn't have formulas yet
			break;
	}
}

// ── Snapshot ─────────────────────────────────────────────────

function serializeShipState(state: ShipState): SerializedShipState {
	return {
		slug: state.slug,
		power: Math.round(state.power * 1000) / 1000,
		coreLife: Math.round(state.coreLife * 1000) / 1000,
		shield: Math.round(state.shield * 1000) / 1000,
		hull: Math.round(state.hull * 1000) / 1000,
		ammo: { ...state.ammo },
		position: state.position,
		activeEquipment: [...state.activeEquipment],
	};
}

function takeSnapshot(t: number, ships: Record<string, ShipState>, events: SimEvent[]): SimulationSnapshot {
	const serialized: Record<string, SerializedShipState> = {};
	for (const [key, state] of Object.entries(ships)) {
		serialized[key] = serializeShipState(state);
	}
	return { t, ships: serialized, events: [...events] };
}

// ── Main entry point ────────────────────────────────────────

export function simulate(scenario: Scenario, constants: Constants = DEFAULT_CONSTANTS): SimulationSnapshot[] {
	// Initialize ships
	const ships: Record<string, ShipState> = {};
	const tunings: Record<string, ActionTuning> = {};

	for (const [slug, spec] of Object.entries(scenario.ships)) {
		const { loadout, equipment, tuning } = hydrateScenarioShip(spec);
		ships[slug] = initShipState(slug, loadout, equipment, tuning);
		tunings[slug] = tuning;
	}

	// Sort actions by time
	const actions = [...scenario.actions].sort((a, b) => a.t - b.t);

	const snapshots: SimulationSnapshot[] = [];
	let currentTime = 0;

	// Initial snapshot
	snapshots.push(takeSnapshot(0, ships, []));

	// Process each action
	for (const action of actions) {
		const events: SimEvent[] = [];
		const elapsed = action.t - currentTime;

		// Advance time for all ships
		for (const [slug, ship] of Object.entries(ships)) {
			if (ship.hull > 0) {
				advanceTime(ship, elapsed, tunings[slug], constants, events);
			}
		}

		currentTime = action.t;

		// Execute the action
		executeAction(action, ships, tunings, constants, events);

		// Take snapshot
		snapshots.push(takeSnapshot(currentTime, ships, events));
	}

	return snapshots;
}
