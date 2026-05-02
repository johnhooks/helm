import { assert, ErrorCode, HelmError } from '@helm/errors';
import { store as productsStore } from '@helm/products';
import type {
	ShipLoadout,
	SystemComponentResponse,
	SystemSlots,
} from '@helm/types';
import type { select as globalSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import type { State } from './types';

/**
 * @throws {HelmError} When a required system slot is missing.
 */
export function getSystemSlots(
	systems: SystemComponentResponse[]
): SystemSlots {
	const core = systems.find((s) => s.slot === 'core');
	const drive = systems.find((s) => s.slot === 'drive');
	const sensor = systems.find((s) => s.slot === 'sensor');
	const shield = systems.find((s) => s.slot === 'shield');
	const nav = systems.find((s) => s.slot === 'nav');

	assert(
		core,
		ErrorCode.ShipsMissingSystem,
		'Ship missing required system: core'
	);
	assert(
		drive,
		ErrorCode.ShipsMissingSystem,
		'Ship missing required system: drive'
	);
	assert(
		sensor,
		ErrorCode.ShipsMissingSystem,
		'Ship missing required system: sensor'
	);
	assert(
		shield,
		ErrorCode.ShipsMissingSystem,
		'Ship missing required system: shield'
	);
	assert(
		nav,
		ErrorCode.ShipsMissingSystem,
		'Ship missing required system: nav'
	);

	return { core, drive, sensor, shield, nav };
}

/**
 * @throws {HelmError} Safe, user-facing error wrapping the underlying cause.
 */
export function expectLoadout(
	state: State,
	select: typeof globalSelect
): ShipLoadout {
	try {
		const ship = state.ship.ship;
		assert(ship, ErrorCode.ShipsNotLoaded, 'Expected ship to be loaded');

		const systems = state.systems.systems;
		assert(
			systems,
			ErrorCode.ShipsSystemsNotLoaded,
			'Expected systems to be loaded'
		);

		const slots = getSystemSlots(systems);
		const products = select(productsStore);

		return {
			ship,
			slots,
			products: {
				core: products.getPreloadedProduct(slots.core.product_id),
				drive: products.getPreloadedProduct(slots.drive.product_id),
				sensor: products.getPreloadedProduct(slots.sensor.product_id),
				shield: products.getPreloadedProduct(slots.shield.product_id),
				nav: products.getPreloadedProduct(slots.nav.product_id),
			},
		};
	} catch (error) {
		throw HelmError.safe(
			ErrorCode.ShipsLoadoutFailed,
			__(
				'Ship link failed to load ship systems — expected data is missing',
				'helm'
			),
			error
		);
	}
}
