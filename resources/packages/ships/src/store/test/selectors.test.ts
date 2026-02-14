import { describe, it, expect, beforeEach } from 'vitest';
import { HelmError } from '@helm/errors';
import { store as productsStore } from '@helm/products';
import type { Product, WithRestLinks } from '@helm/types';
import {
	getShip,
	isShipLoading,
	getShipError,
	getSystems,
	areSystemsLoading,
	getSystemsError,
	getSystemStats,
} from '../selectors';
import { createShipState, createSystemComponent, createProductEmbed, createState } from './fixtures';

describe( 'getShip', () => {
	it( 'returns the ship when it exists', () => {
		const ship = createShipState();
		const state = createState( { ships: { byId: { 1: ship } } } );

		expect( getShip( state, 1 ) ).toBe( ship );
	} );

	it( 'returns undefined for unknown ship', () => {
		const state = createState();

		expect( getShip( state, 999 ) ).toBeUndefined();
	} );
} );

describe( 'isShipLoading', () => {
	it( 'returns true when loading', () => {
		const state = createState( { ships: { isLoading: { 1: true } } } );

		expect( isShipLoading( state, 1 ) ).toBe( true );
	} );

	it( 'returns false when not loading', () => {
		const state = createState( { ships: { isLoading: { 1: false } } } );

		expect( isShipLoading( state, 1 ) ).toBe( false );
	} );

	it( 'returns false for unknown ship', () => {
		const state = createState();

		expect( isShipLoading( state, 999 ) ).toBe( false );
	} );
} );

describe( 'getShipError', () => {
	it( 'returns the error when it exists', () => {
		const error = new HelmError( 'helm.ship.not_found', 'Not found' );
		const state = createState( { ships: { errors: { 1: error } } } );

		expect( getShipError( state, 1 ) ).toBe( error );
	} );

	it( 'returns undefined when no error', () => {
		const state = createState();

		expect( getShipError( state, 999 ) ).toBeUndefined();
	} );
} );

describe( 'getSystems', () => {
	it( 'returns systems when they exist', () => {
		const systems = [ createSystemComponent() ];
		const state = createState( { systems: { byShipId: { 1: systems } } } );

		expect( getSystems( state, 1 ) ).toBe( systems );
	} );

	it( 'returns undefined for unknown ship', () => {
		const state = createState();

		expect( getSystems( state, 999 ) ).toBeUndefined();
	} );
} );

describe( 'areSystemsLoading', () => {
	it( 'returns true when loading', () => {
		const state = createState( { systems: { isLoading: { 1: true } } } );

		expect( areSystemsLoading( state, 1 ) ).toBe( true );
	} );

	it( 'returns false when not loading', () => {
		const state = createState( { systems: { isLoading: { 1: false } } } );

		expect( areSystemsLoading( state, 1 ) ).toBe( false );
	} );

	it( 'returns false for unknown ship', () => {
		const state = createState();

		expect( areSystemsLoading( state, 999 ) ).toBe( false );
	} );
} );

describe( 'getSystemsError', () => {
	it( 'returns the error when it exists', () => {
		const error = new HelmError( 'helm.test', 'Error' );
		const state = createState( { systems: { errors: { 1: error } } } );

		expect( getSystemsError( state, 1 ) ).toBe( error );
	} );

	it( 'returns undefined when no error', () => {
		const state = createState();

		expect( getSystemsError( state, 999 ) ).toBeUndefined();
	} );
} );

/* ----------------------------------------------------------------
 *  getSystemStats — registry selector (cross-store)
 * --------------------------------------------------------------- */

describe( 'getSystemStats', () => {
	const CORE_PRODUCT_ID = 10;
	const DRIVE_PRODUCT_ID = 20;
	const SENSOR_PRODUCT_ID = 30;

	const coreProduct = createProductEmbed( {
		id: CORE_PRODUCT_ID,
		type: 'core',
		rate: 2.5,
		mult_a: 1.2,
	} );

	const driveProduct = createProductEmbed( {
		id: DRIVE_PRODUCT_ID,
		type: 'drive',
		slug: 'pulse_i',
		label: 'Pulse-I Drive',
		range: 80,
		mult_a: 4.0,
		mult_b: 1.5,
	} );

	const sensorProduct = createProductEmbed( {
		id: SENSOR_PRODUCT_ID,
		type: 'sensor',
		slug: 'sweep_i',
		label: 'Sweep-I Sensor',
		range: 12,
		mult_a: 1.0,
		chance: 0.45,
	} );

	const products: Record< number, WithRestLinks< Product > > = {
		[ CORE_PRODUCT_ID ]: coreProduct,
		[ DRIVE_PRODUCT_ID ]: driveProduct,
		[ SENSOR_PRODUCT_ID ]: sensorProduct,
	};

	function mockRegistry( productLookup: Record< number, WithRestLinks< Product > > = products ) {
		( getSystemStats as any ).registry = {
			select: ( storeDescriptor: typeof productsStore ) => {
				if ( storeDescriptor === productsStore ) {
					return {
						getProduct: ( id: number ) => productLookup[ id ],
					};
				}
				throw new Error( `Unexpected store: ${ storeDescriptor }` );
			},
		};
	}

	function createSystemsState() {
		return createState( {
			systems: {
				byShipId: {
					1: [
						createSystemComponent( { id: 1, slot: 'core', product_id: CORE_PRODUCT_ID, life: 500, condition: 0.95 } ),
						createSystemComponent( { id: 2, slot: 'drive', product_id: DRIVE_PRODUCT_ID, condition: 0.8 } ),
						createSystemComponent( { id: 3, slot: 'sensor', product_id: SENSOR_PRODUCT_ID, condition: 0.6 } ),
					],
				},
			},
		} );
	}

	beforeEach( () => {
		mockRegistry();
	} );

	it( 'returns undefined when systems are not loaded', () => {
		const state = createState();

		expect( getSystemStats( state, 1 ) ).toBeUndefined();
	} );

	it( 'returns engineering stats from core component and product', () => {
		const state = createSystemsState();
		const stats = getSystemStats( state, 1 );

		expect( stats?.engineering ).toEqual( {
			rechargeRate: 2.5,
			coreLife: 500,
			outputMult: 1.2,
			condition: 95,
		} );
	} );

	it( 'returns navigation stats from drive component and product', () => {
		const state = createSystemsState();
		const stats = getSystemStats( state, 1 );

		expect( stats?.navigation ).toEqual( {
			range: 80,
			speed: 4.0,
			draw: 1.5,
			condition: 80,
		} );
	} );

	it( 'returns sensor stats from sensor component and product', () => {
		const state = createSystemsState();
		const stats = getSystemStats( state, 1 );

		expect( stats?.sensors ).toEqual( {
			range: 12,
			scanDuration: 1.0,
			discovery: 45,
			condition: 60,
		} );
	} );

	it( 'defaults nullable product fields to zero', () => {
		mockRegistry( {
			[ CORE_PRODUCT_ID ]: createProductEmbed( { id: CORE_PRODUCT_ID, rate: null, mult_a: null } ),
			[ DRIVE_PRODUCT_ID ]: createProductEmbed( { id: DRIVE_PRODUCT_ID, range: null, mult_a: null, mult_b: null } ),
			[ SENSOR_PRODUCT_ID ]: createProductEmbed( { id: SENSOR_PRODUCT_ID, range: null, mult_a: null, chance: null } ),
		} );

		const state = createSystemsState();
		const stats = getSystemStats( state, 1 )!;

		expect( stats.engineering.rechargeRate ).toBe( 0 );
		expect( stats.engineering.outputMult ).toBe( 1 );
		expect( stats.navigation.range ).toBe( 0 );
		expect( stats.navigation.speed ).toBe( 0 );
		expect( stats.navigation.draw ).toBe( 0 );
		expect( stats.sensors.range ).toBe( 0 );
		expect( stats.sensors.scanDuration ).toBe( 0 );
		expect( stats.sensors.discovery ).toBe( 0 );
	} );

	it( 'throws with code and product id when core product is missing', () => {
		mockRegistry( {
			[ DRIVE_PRODUCT_ID ]: driveProduct,
			[ SENSOR_PRODUCT_ID ]: sensorProduct,
		} );

		const state = createSystemsState();
		let error: HelmError | undefined;

		try {
			getSystemStats( state, 1 );
		} catch ( e ) {
			error = e as HelmError;
		}

		expect( error ).toBeInstanceOf( HelmError );
		expect( error?.message ).toBe( 'helm.ship.missing_core_product' );
		expect( error?.detail ).toBe( `Product store missing expected preloaded core: ${ CORE_PRODUCT_ID }` );
	} );

	it( 'throws with code and product id when drive product is missing', () => {
		mockRegistry( {
			[ CORE_PRODUCT_ID ]: coreProduct,
			[ SENSOR_PRODUCT_ID ]: sensorProduct,
		} );

		const state = createSystemsState();
		let error: HelmError | undefined;

		try {
			getSystemStats( state, 1 );
		} catch ( e ) {
			error = e as HelmError;
		}

		expect( error ).toBeInstanceOf( HelmError );
		expect( error?.message ).toBe( 'helm.ship.missing_drive_product' );
		expect( error?.detail ).toBe( `Product store missing expected preloaded drive: ${ DRIVE_PRODUCT_ID }` );
	} );

	it( 'throws with code and product id when sensor product is missing', () => {
		mockRegistry( {
			[ CORE_PRODUCT_ID ]: coreProduct,
			[ DRIVE_PRODUCT_ID ]: driveProduct,
		} );

		const state = createSystemsState();
		let error: HelmError | undefined;

		try {
			getSystemStats( state, 1 );
		} catch ( e ) {
			error = e as HelmError;
		}

		expect( error ).toBeInstanceOf( HelmError );
		expect( error?.message ).toBe( 'helm.ship.missing_sensor_product' );
		expect( error?.detail ).toBe( `Product store missing expected preloaded sensor: ${ SENSOR_PRODUCT_ID }` );
	} );
} );
