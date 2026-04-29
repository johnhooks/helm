import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorCode, HelmError } from '@helm/errors';
import { store as productsStore } from '@helm/products';
import type { Product, WithRestLinks } from '@helm/types';
import {
	getShip,
	getShipError,
	getSystems,
	getSystemsError,
	getEdits,
	isSubmitting,
	getEditError,
	getShipWithLoadout,
	getSystemStats,
} from '../selectors';
import { createShipState, createSystemComponent, createProductEmbed, createEditsState, createState } from './fixtures';

describe( 'getShip', () => {
	it( 'returns the ship when it exists', () => {
		const ship = createShipState();
		const state = createState( { ship: { ship } } );

		expect( getShip( state, 1 ) ).toBe( ship );
	} );

	it( 'returns undefined when ship is null', () => {
		const state = createState();

		expect( getShip( state, 1 ) ).toBeUndefined();
	} );
} );

describe( 'getShipError', () => {
	it( 'returns the error when it exists', () => {
		const error = new HelmError( 'helm.ship.not_found', 'Not found' );
		const state = createState( { ship: { error } } );

		expect( getShipError( state ) ).toBe( error );
	} );

	it( 'returns null when no error', () => {
		const state = createState();

		expect( getShipError( state ) ).toBeNull();
	} );
} );

describe( 'getSystems', () => {
	it( 'returns systems when they exist', () => {
		const systems = [ createSystemComponent() ];
		const state = createState( { systems: { systems } } );

		expect( getSystems( state, 1 ) ).toBe( systems );
	} );

	it( 'returns undefined when systems is null', () => {
		const state = createState();

		expect( getSystems( state, 1 ) ).toBeUndefined();
	} );
} );

describe( 'getSystemsError', () => {
	it( 'returns the error when it exists', () => {
		const error = new HelmError( 'helm.test', 'Error' );
		const state = createState( { systems: { error } } );

		expect( getSystemsError( state ) ).toBe( error );
	} );

	it( 'returns null when no error', () => {
		const state = createState();

		expect( getSystemsError( state ) ).toBeNull();
	} );
} );

describe( 'getEdits', () => {
	it( 'returns the staged ship edits', () => {
		const ship = { power_mode: 'overdrive' };
		const state = createState( {
			edits: createEditsState( { ship } ),
		} );

		expect( getEdits( state ) ).toBe( ship );
	} );

	it( 'returns null when no edits are staged', () => {
		const state = createState();

		expect( getEdits( state ) ).toBeNull();
	} );
} );

describe( 'isSubmitting', () => {
	it( 'returns true when submitting', () => {
		const state = createState( {
			edits: createEditsState( { isSubmitting: true } ),
		} );

		expect( isSubmitting( state ) ).toBe( true );
	} );

	it( 'returns false when not submitting', () => {
		const state = createState();

		expect( isSubmitting( state ) ).toBe( false );
	} );
} );

describe( 'getEditError', () => {
	it( 'returns the error when it exists', () => {
		const error = new HelmError( 'helm.test', 'Error' );
		const state = createState( {
			edits: createEditsState( { error } ),
		} );

		expect( getEditError( state ) ).toBe( error );
	} );

	it( 'returns null when no error', () => {
		const state = createState();

		expect( getEditError( state ) ).toBeNull();
	} );
} );

/* ----------------------------------------------------------------
 *  Shared test data for cross-store selectors
 * --------------------------------------------------------------- */

const CORE_PRODUCT_ID = 10;
const DRIVE_PRODUCT_ID = 20;
const SENSOR_PRODUCT_ID = 30;
const SHIELD_PRODUCT_ID = 40;
const NAV_PRODUCT_ID = 50;

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
	sustain: 80,
	mult_a: 4.0,
	mult_b: 1.5,
} );

const sensorProduct = createProductEmbed( {
	id: SENSOR_PRODUCT_ID,
	type: 'sensor',
	slug: 'sweep_i',
	label: 'Sweep-I Sensor',
	sustain: 12,
	mult_a: 1.0,
	chance: 0.45,
} );

const shieldProduct = createProductEmbed( {
	id: SHIELD_PRODUCT_ID,
	type: 'shield',
	slug: 'aegis_i',
	label: 'Aegis-I Shield',
} );

const navProduct = createProductEmbed( {
	id: NAV_PRODUCT_ID,
	type: 'nav',
	slug: 'compass_i',
	label: 'Compass-I Nav',
} );

const allProducts: Record< number, WithRestLinks< Product > > = {
	[ CORE_PRODUCT_ID ]: coreProduct,
	[ DRIVE_PRODUCT_ID ]: driveProduct,
	[ SENSOR_PRODUCT_ID ]: sensorProduct,
	[ SHIELD_PRODUCT_ID ]: shieldProduct,
	[ NAV_PRODUCT_ID ]: navProduct,
};

function mockRegistry(
	selector: any,
	productLookup: Record< number, WithRestLinks< Product > > = allProducts
) {
	( selector as any ).registry = {
		select: ( storeDescriptor: typeof productsStore ) => {
			if ( storeDescriptor === productsStore ) {
				return {
					getPreloadedProduct: ( id: number ) => {
						const product = productLookup[ id ];
						if ( ! product ) {
							throw new HelmError( 'helm.products.not_preloaded', `Expected product to be preloaded: ${ id }` );
						}
						return product;
					},
				};
			}
			throw new Error( `Unexpected store: ${ storeDescriptor }` );
		},
	};
}

function createLoadedState() {
	return createState( {
		ship: { ship: createShipState() },
		systems: {
			systems: [
				createSystemComponent( { id: 1, slot: 'core', product_id: CORE_PRODUCT_ID, life: 500, condition: 0.95 } ),
				createSystemComponent( { id: 2, slot: 'drive', product_id: DRIVE_PRODUCT_ID, condition: 0.8 } ),
				createSystemComponent( { id: 3, slot: 'sensor', product_id: SENSOR_PRODUCT_ID, condition: 0.6 } ),
				createSystemComponent( { id: 4, slot: 'shield', product_id: SHIELD_PRODUCT_ID, condition: 1.0 } ),
				createSystemComponent( { id: 5, slot: 'nav', product_id: NAV_PRODUCT_ID, condition: 0.9 } ),
			],
		},
	} );
}

/* ----------------------------------------------------------------
 *  getShipWithLoadout — registry selector (cross-store)
 * --------------------------------------------------------------- */

describe( 'getShipWithLoadout', () => {
	beforeEach( () => {
		mockRegistry( getShipWithLoadout );
	} );

	it( 'throws when ship is not loaded', () => {
		const state = createState( {
			systems: {
				systems: [
					createSystemComponent( { slot: 'core' } ),
				],
			},
		} );

		expect( () => getShipWithLoadout( state, 1 ) ).toThrow( HelmError );
	} );

	it( 'throws when systems are not loaded', () => {
		const state = createState( {
			ship: { ship: createShipState() },
		} );

		expect( () => getShipWithLoadout( state, 1 ) ).toThrow( HelmError );
	} );

	it( 'returns full loadout when data is loaded', () => {
		const state = createLoadedState();
		const loadout = getShipWithLoadout( state, 1 );

		expect( loadout.ship ).toBe( state.ship.ship );
		expect( loadout.slots.core.slot ).toBe( 'core' );
		expect( loadout.slots.drive.slot ).toBe( 'drive' );
		expect( loadout.slots.sensor.slot ).toBe( 'sensor' );
		expect( loadout.slots.shield.slot ).toBe( 'shield' );
		expect( loadout.slots.nav.slot ).toBe( 'nav' );
		expect( loadout.products.core ).toBe( coreProduct );
		expect( loadout.products.drive ).toBe( driveProduct );
		expect( loadout.products.sensor ).toBe( sensorProduct );
		expect( loadout.products.shield ).toBe( shieldProduct );
		expect( loadout.products.nav ).toBe( navProduct );
	} );

	it( 'throws a safe ship link error when a required slot is missing', () => {
		const state = createState( {
			ship: { ship: createShipState() },
			systems: {
				systems: [
					createSystemComponent( { slot: 'core', product_id: CORE_PRODUCT_ID } ),
					// missing drive, sensor, shield, nav
				],
			},
		} );

		let error: HelmError | undefined;
		try {
			getShipWithLoadout( state, 1 );
		} catch ( e ) {
			error = e as HelmError;
		}

		expect( error ).toBeInstanceOf( HelmError );
		expect( error?.message ).toBe( ErrorCode.ShipsLoadoutFailed );
		expect( error?.isSafe ).toBe( true );
		expect( error?.cause ).toBeInstanceOf( HelmError );
	} );

	it( 'throws a safe ship link error when a preloaded product is missing', () => {
		mockRegistry( getShipWithLoadout, {
			[ DRIVE_PRODUCT_ID ]: driveProduct,
			[ SENSOR_PRODUCT_ID ]: sensorProduct,
			[ SHIELD_PRODUCT_ID ]: shieldProduct,
			[ NAV_PRODUCT_ID ]: navProduct,
		} );

		const state = createLoadedState();

		let error: HelmError | undefined;
		try {
			getShipWithLoadout( state, 1 );
		} catch ( e ) {
			error = e as HelmError;
		}

		expect( error ).toBeInstanceOf( HelmError );
		expect( error?.message ).toBe( ErrorCode.ShipsLoadoutFailed );
		expect( error?.isSafe ).toBe( true );
		expect( error?.cause ).toBeInstanceOf( HelmError );
	} );
} );

/* ----------------------------------------------------------------
 *  getSystemStats — registry selector (cross-store)
 * --------------------------------------------------------------- */

describe( 'getSystemStats', () => {
	beforeEach( () => {
		mockRegistry( getSystemStats );
	} );

	it( 'throws when systems are not loaded', () => {
		const state = createState();

		expect( () => getSystemStats( state, 1 ) ).toThrow( HelmError );
	} );

	it( 'throws when ship is not loaded', () => {
		const state = createState( {
			systems: {
				systems: [
					createSystemComponent( { slot: 'core' } ),
				],
			},
		} );

		expect( () => getSystemStats( state, 1 ) ).toThrow( HelmError );
	} );

	it( 'returns engineering stats from core component and product', () => {
		const state = createLoadedState();
		const stats = getSystemStats( state, 1 );

		expect( stats.engineering ).toEqual( {
			rechargeRate: 2.5,
			coreLife: 500,
			outputMult: 1.2,
			condition: 95,
		} );
	} );

	it( 'returns navigation stats from drive component and product', () => {
		const state = createLoadedState();
		const stats = getSystemStats( state, 1 );

		expect( stats.navigation ).toEqual( {
			range: 80,
			speed: 4.0,
			draw: 1.5,
			condition: 80,
		} );
	} );

	it( 'returns sensor stats from sensor component and product', () => {
		const state = createLoadedState();
		const stats = getSystemStats( state, 1 );

		expect( stats.sensors ).toEqual( {
			range: 12,
			scanDuration: 1.0,
			discovery: 45,
			condition: 60,
		} );
	} );

	it( 'memoizes stats when state and products are unchanged', () => {
		const state = createLoadedState();

		const first = getSystemStats( state, 1 );
		const second = getSystemStats( state, 1 );

		expect( second ).toBe( first );
	} );

	it( 'defaults nullable product fields to zero', () => {
		mockRegistry( getSystemStats, {
			[ CORE_PRODUCT_ID ]: createProductEmbed( { id: CORE_PRODUCT_ID, rate: null, mult_a: null } ),
			[ DRIVE_PRODUCT_ID ]: createProductEmbed( { id: DRIVE_PRODUCT_ID, sustain: null, mult_a: null, mult_b: null } ),
			[ SENSOR_PRODUCT_ID ]: createProductEmbed( { id: SENSOR_PRODUCT_ID, sustain: null, mult_a: null, chance: null } ),
			[ SHIELD_PRODUCT_ID ]: shieldProduct,
			[ NAV_PRODUCT_ID ]: navProduct,
		} );

		const state = createLoadedState();
		const stats = getSystemStats( state, 1 );

		expect( stats.engineering.rechargeRate ).toBe( 0 );
		expect( stats.engineering.outputMult ).toBe( 1 );
		expect( stats.navigation.range ).toBe( 0 );
		expect( stats.navigation.speed ).toBe( 0 );
		expect( stats.navigation.draw ).toBe( 0 );
		expect( stats.sensors.range ).toBe( 0 );
		expect( stats.sensors.scanDuration ).toBe( 0 );
		expect( stats.sensors.discovery ).toBe( 0 );
	} );

	it( 'throws a safe ship link error when a preloaded product is missing', () => {
		mockRegistry( getSystemStats, {
			[ DRIVE_PRODUCT_ID ]: driveProduct,
			[ SENSOR_PRODUCT_ID ]: sensorProduct,
			[ SHIELD_PRODUCT_ID ]: shieldProduct,
			[ NAV_PRODUCT_ID ]: navProduct,
		} );

		const state = createLoadedState();
		let error: HelmError | undefined;

		try {
			getSystemStats( state, 1 );
		} catch ( e ) {
			error = e as HelmError;
		}

		expect( error ).toBeInstanceOf( HelmError );
		expect( error?.message ).toBe( ErrorCode.ShipsLoadoutFailed );
		expect( error?.isSafe ).toBe( true );
		expect( error?.cause ).toBeInstanceOf( HelmError );
	} );
} );
