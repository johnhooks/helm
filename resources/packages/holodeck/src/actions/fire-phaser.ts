import {
	phaserDraw, phaserShieldDrain, phaserHullDamage,
	ecmLockDegradation,
	DEFAULT_DSP_CONSTANTS,
} from '@helm/formulas';
import type { Ship } from '../ship';
import type { CatalogProduct } from '../types/catalog';
import type { Action, ActionContext, ActionHandler, ActionIntent, ActionOutcome } from './types';
import { ActionError, ActionErrorCode } from './types';
import { ActionStatus } from '../enums/action-status';

const DEFAULT_DURATION = 3600;

export const firePhaserHandler: ActionHandler = {
	validate(ship: Ship, params: Record<string, unknown>, context: ActionContext): void {
		const state = ship.resolve();

		const phaser = state.loadout.equipment.find(
			(eq) => eq.product.type === 'weapon' && eq.product.slug.includes('phaser'),
		);
		if (!phaser) {
			throw new ActionError(
				ActionErrorCode.ShipMissingEquipment,
				'Ship has no phaser in loadout',
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
		const duration = (params.duration as number) ?? DEFAULT_DURATION;

		const phaser = state.loadout.equipment.find(
			(eq) => eq.product.type === 'weapon' && eq.product.slug.includes('phaser'),
		)!;

		const weaponMult = state.loadout.hull.weaponDrawMultiplier ?? 1.0;
		const baseDrainRate = phaser.product.mult_a ?? 0;
		const drainRate = phaserShieldDrain(baseDrainRate, state.shieldPriority);
		const baseDraw = (phaser.product as CatalogProduct).draw ?? 0;
		const powerDraw = phaserDraw(baseDraw, weaponMult);

		// Check target ECM
		let ecmDegradation = 0;
		const target = context.getShip(targetId);
		if (target) {
			const targetState = target.resolve();
			const ecm = targetState.loadout.equipment.find(
				(eq) => eq.product.slug === 'ecm_mk1',
			);
			if (ecm && target.isEquipmentActive('ecm_mk1')) {
				ecmDegradation = ecmLockDegradation(ecm.product.mult_a ?? 0);
			}
		}

		return {
			deferredUntil: now + duration,
			result: {
				target_ship_id: targetId,
				drain_rate: drainRate,
				base_drain_rate: baseDrainRate,
				power_draw: powerDraw,
				duration,
				ecm_degradation: ecmDegradation,
			},
		};
	},

	resolve(ship: Ship, action: Action, context: ActionContext): ActionOutcome {
		const targetId = action.result.target_ship_id as string;
		const drainRate = action.result.drain_rate as number;
		const powerDraw = action.result.power_draw as number;
		const duration = action.result.duration as number;
		const ecmDegradation = action.result.ecm_degradation as number;
		const baseDrainRate = action.result.base_drain_rate as number;

		const durationHours = duration / 3600;

		// Consume power from attacker
		ship.consumePower(powerDraw * durationHours);

		const target = context.getShip(targetId);
		if (!target || target.resolve().hull <= 0) {
			return {
				status: ActionStatus.Fulfilled,
				result: { shield_drained: 0, hull_damage: 0, target_destroyed: false },
			};
		}

		// Calculate effective drain
		let totalDrain = drainRate * durationHours;
		if (ecmDegradation > 0) {
			totalDrain *= (1 - ecmDegradation);
		}

		const beforeShield = target.resolve().shield;
		let shieldDrained = 0;
		let hullDamage = 0;

		const hullDamageMult = DEFAULT_DSP_CONSTANTS.phaserHullDamageMult;

		if (beforeShield <= 0) {
			// Shields already down — full duration hits hull
			const hullDmgRate = phaserHullDamage(baseDrainRate, 1.0, hullDamageMult);
			hullDamage = hullDmgRate * durationHours * (1 - ecmDegradation);
			target.absorbDamage(hullDamage);
		} else if (totalDrain >= beforeShield) {
			// Shields depleted mid-burst — remaining time hits hull
			shieldDrained = beforeShield;
			const shieldDepletionFraction = beforeShield / totalDrain;
			const remainingHours = durationHours * (1 - shieldDepletionFraction);

			const hullDmgRate = phaserHullDamage(baseDrainRate, 1.0, hullDamageMult);
			hullDamage = hullDmgRate * remainingHours * (1 - ecmDegradation);

			target.absorbDamage(beforeShield + hullDamage);
		} else {
			// Shields absorb all drain
			shieldDrained = totalDrain;
			target.absorbDamage(totalDrain);
		}

		return {
			status: ActionStatus.Fulfilled,
			result: {
				shield_drained: shieldDrained,
				hull_damage: hullDamage,
				target_destroyed: target.resolve().hull <= 0,
			},
		};
	},
};
