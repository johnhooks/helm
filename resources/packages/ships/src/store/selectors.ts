import { createRegistrySelector, createSelector } from '@wordpress/data';
import type { HelmError } from '@helm/errors';
import { store as productsStore } from '@helm/products';
import type { ShipLoadout, ShipState, SystemComponentResponse, SystemStats, WithRestLinks } from '@helm/types';
import type { State } from './types';
import { expectLoadout, getSystemSlots } from './utils';

export const getShip = (
	state: State,
	_shipId: number
): WithRestLinks< ShipState > | undefined => state.ship.ship ?? undefined;

export const getShipError = (
	state: State
): HelmError | null => state.ship.error;

export const getSystems = (
	state: State,
	_shipId: number
): SystemComponentResponse[] | undefined => state.systems.systems ?? undefined;

export const getSystemsError = (
	state: State
): HelmError | null => state.systems.error;

export const getEdits = (
	state: State
): Partial< ShipState > | null => state.edits.ship;

export const isSubmitting = (
	state: State
): boolean => state.edits.isSubmitting;

export const getEditError = (
	state: State
): HelmError | null => state.edits.error;

/**
 * @throws {HelmError} When ship, systems, a required slot, or its preloaded product is missing.
 */
export const getShipWithLoadout = createRegistrySelector(
	( select ) => ( state: State, _shipId: number ): ShipLoadout => {
		return expectLoadout( state, select );
	}
);

/**
 * @throws {HelmError} When ship, systems, a required slot, or its preloaded product is missing.
 */
export const getSystemStats = createRegistrySelector(
	( select ) =>
		createSelector(
			( state: State, _shipId: number ): SystemStats => {
				const { slots, products } = expectLoadout( state, select );

				return {
					engineering: {
						rechargeRate: products.core.rate ?? 0,
						coreLife: slots.core.life ?? 0,
						outputMult: products.core.mult_a ?? 1,
						condition: slots.core.condition * 100,
					},
					navigation: {
						range: products.drive.sustain ?? 0,
						speed: products.drive.mult_a ?? 0,
						draw: products.drive.mult_b ?? 0,
						condition: slots.drive.condition * 100,
					},
					sensors: {
						range: products.sensor.sustain ?? 0,
						scanDuration: products.sensor.mult_a ?? 0,
						discovery: ( products.sensor.chance ?? 0 ) * 100,
						condition: slots.sensor.condition * 100,
					},
				};
			},
			( state: State ) => {
				const { ship } = state.ship;
				const { systems } = state.systems;

				if ( ! systems ) {
					return [ ship, systems ];
				}

				try {
					const slots = getSystemSlots( systems );
					const products = select( productsStore );

					return [
						ship,
						systems,
						products.getProduct( slots.core.product_id ),
						products.getProduct( slots.drive.product_id ),
						products.getProduct( slots.sensor.product_id ),
						products.getProduct( slots.shield.product_id ),
						products.getProduct( slots.nav.product_id ),
					];
				} catch {
					return [ ship, systems ];
				}
			}
		)
);
