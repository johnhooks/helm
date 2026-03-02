import {
	torpedoHitChance, torpedoDamage,
	pdsInterception, ecmLockDegradation,
	shieldAbsorption,
} from '@helm/formulas';
import type { Ship } from '../ship';
import type { Action, ActionContext, ActionHandler, ActionIntent, ActionOutcome } from './types';
import { ActionError, ActionErrorCode } from './types';
import { ActionStatus } from '../enums/action-status';

const TORPEDO_FLIGHT_SECONDS = 120;

export const fireTorpedoHandler: ActionHandler = {
	validate(ship: Ship, params: Record<string, unknown>, context: ActionContext): void {
		const state = ship.resolve();

		const launcher = state.loadout.equipment.find(
			(eq) => eq.product.type === 'weapon' && eq.product.slug.includes('torpedo'),
		);
		if (!launcher) {
			throw new ActionError(
				ActionErrorCode.ShipMissingEquipment,
				'Ship has no torpedo launcher in loadout',
			);
		}

		if ((state.ammo[launcher.product.slug] ?? 0) <= 0) {
			throw new ActionError(
				ActionErrorCode.ShipInsufficientAmmo,
				'No torpedoes remaining',
			);
		}

		const targetId = params.target_ship_id as string | undefined;
		if (!targetId) {
			throw new ActionError(
				ActionErrorCode.ActionMissingParam,
				'Missing target_ship_id',
			);
		}

		const target = context.getShip(targetId);
		if (!target) {
			throw new ActionError(
				ActionErrorCode.TargetNotFound,
				`Target ship not found: ${targetId}`,
			);
		}

		if (target.resolve().hull <= 0) {
			throw new ActionError(
				ActionErrorCode.TargetDestroyed,
				'Target ship is destroyed',
			);
		}
	},

	handle(
		ship: Ship,
		params: Record<string, unknown>,
		now: number,
		context: ActionContext,
	): ActionIntent {
		const state = ship.resolve();
		const targetId = params.target_ship_id as string;

		const launcher = state.loadout.equipment.find(
			(eq) => eq.product.type === 'weapon' && eq.product.slug.includes('torpedo'),
		)!;

		// Consume ammo immediately
		ship.consumeAmmo(launcher.product.slug);

		// Base hit chance
		const baseAccuracy = launcher.product.mult_b ?? 0.7;

		// ECM reduction
		let ecmReduction = 0;
		const target = context.getShip(targetId);
		if (target) {
			const targetState = target.resolve();
			const ecm = targetState.loadout.equipment.find(
				(eq) => eq.product.slug === 'ecm_mk1',
			);
			if (ecm && target.isEquipmentActive('ecm_mk1')) {
				ecmReduction = ecmLockDegradation(ecm.product.mult_a ?? 0);
			}
		}

		// PDS chance
		let pdsChance = 0;
		if (target) {
			const targetState = target.resolve();
			const pds = targetState.loadout.equipment.find(
				(eq) => eq.product.slug === 'pds_mk1',
			);
			if (pds && target.isEquipmentActive('pds_mk1')) {
				pdsChance = pdsInterception(pds.product.mult_a ?? 0, 1);
			}
		}

		const hitChance = torpedoHitChance(baseAccuracy, ecmReduction, 0);
		const payload = torpedoDamage(launcher.product.mult_a ?? 0);

		return {
			deferredUntil: now + TORPEDO_FLIGHT_SECONDS,
			result: {
				target_ship_id: targetId,
				hit_chance: hitChance,
				pds_chance: pdsChance,
				payload,
				launcher_slug: launcher.product.slug,
			},
		};
	},

	resolve(ship: Ship, action: Action, context: ActionContext): ActionOutcome {
		const targetId = action.result.target_ship_id as string;
		const hitChance = action.result.hit_chance as number;
		const pdsChance = action.result.pds_chance as number;
		const payload = action.result.payload as number;

		const target = context.getShip(targetId);
		if (!target || target.resolve().hull <= 0) {
			return {
				status: ActionStatus.Fulfilled,
				result: { hit: false, intercepted: false, damage: 0, shield_damage: 0, hull_damage: 0 },
			};
		}

		// PDS interception check
		if (pdsChance > 0) {
			const pdsRoll = ship.rng.next();
			if (pdsRoll < pdsChance) {
				return {
					status: ActionStatus.Fulfilled,
					result: { hit: false, intercepted: true, damage: 0, shield_damage: 0, hull_damage: 0 },
				};
			}
		}

		// Hit check
		const hitRoll = ship.rng.next();
		if (hitRoll >= hitChance) {
			return {
				status: ActionStatus.Fulfilled,
				result: { hit: false, intercepted: false, damage: payload, shield_damage: 0, hull_damage: 0 },
			};
		}

		// Hit — apply damage via shieldAbsorption
		const targetState = target.resolve();
		const { shieldDamage, hullDamage } = shieldAbsorption(payload, targetState.shield);

		target.absorbDamage(payload);

		return {
			status: ActionStatus.Fulfilled,
			result: {
				hit: true,
				intercepted: false,
				damage: payload,
				shield_damage: shieldDamage,
				hull_damage: hullDamage,
				target_destroyed: target.resolve().hull <= 0,
			},
		};
	},
};
