import { createRegistrySelector } from '@wordpress/data';
import { assert } from '@helm/errors';
import type { HelmError } from '@helm/errors';
import { store as productsStore } from '@helm/products';
import type { ShipState, SystemComponentResponse, SystemStats, WithRestLinks } from '@helm/types';
import type { State } from './types';

export const getShip = (
	state: State,
	shipId: number
): WithRestLinks< ShipState > | undefined => state.ships.byId[ shipId ];

export const isShipLoading = (
	state: State,
	shipId: number
): boolean => state.ships.isLoading[ shipId ] ?? false;

export const getShipError = (
	state: State,
	shipId: number
): HelmError | undefined => state.ships.errors[ shipId ];

export const getSystems = (
	state: State,
	shipId: number
): SystemComponentResponse[] | undefined => state.systems.byShipId[ shipId ];

export const areSystemsLoading = (
	state: State,
	shipId: number
): boolean => state.systems.isLoading[ shipId ] ?? false;

export const getSystemsError = (
	state: State,
	shipId: number
): HelmError | undefined => state.systems.errors[ shipId ];

export const getSystemStats = createRegistrySelector(
	( select ) => ( state: State, shipId: number ): SystemStats | undefined => {
		const systems = state.systems.byShipId[ shipId ];
		if ( ! systems ) {
			return undefined;
		}

		const core = systems.find( ( s ) => s.slot === 'core' );
		const drive = systems.find( ( s ) => s.slot === 'drive' );
		const sensor = systems.find( ( s ) => s.slot === 'sensor' );

		const coreProduct = core
			? select( productsStore ).getProduct( core.product_id )
			: undefined;
		const driveProduct = drive
			? select( productsStore ).getProduct( drive.product_id )
			: undefined;
		const sensorProduct = sensor
			? select( productsStore ).getProduct( sensor.product_id )
			: undefined;

		assert( coreProduct, 'helm.ship.missing_core_product', `Product store missing expected preloaded core: ${ core?.product_id }` );
		assert( driveProduct, 'helm.ship.missing_drive_product', `Product store missing expected preloaded drive: ${ drive?.product_id }` );
		assert( sensorProduct, 'helm.ship.missing_sensor_product', `Product store missing expected preloaded sensor: ${ sensor?.product_id }` );

		return {
			engineering: {
				rechargeRate: coreProduct.rate ?? 0,
				coreLife: core?.life ?? 0,
				outputMult: coreProduct.mult_a ?? 1,
				condition: ( core?.condition ?? 0 ) * 100,
			},
			navigation: {
				range: driveProduct.range ?? 0,
				speed: driveProduct.mult_a ?? 0,
				draw: driveProduct.mult_b ?? 0,
				condition: ( drive?.condition ?? 0 ) * 100,
			},
			sensors: {
				range: sensorProduct.range ?? 0,
				scanDuration: sensorProduct.mult_a ?? 0,
				discovery: ( sensorProduct.chance ?? 0 ) * 100,
				condition: ( sensor?.condition ?? 0 ) * 100,
			},
		};
	}
);
