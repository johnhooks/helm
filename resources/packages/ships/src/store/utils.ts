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
	const slots = {
		core: systems.find((s) => s.slot === 'core'),
		drive: systems.find((s) => s.slot === 'drive'),
		sensor: systems.find((s) => s.slot === 'sensor'),
		shield: systems.find((s) => s.slot === 'shield'),
		nav: systems.find((s) => s.slot === 'nav'),
	};
	const missingSlots = Object.entries(slots)
		.filter(([, system]) => system === undefined)
		.map(([slot]) => slot);

	if (missingSlots.length > 0) {
		throw new HelmError(
			ErrorCode.ShipsMissingSystem,
			`Ship missing required system: ${missingSlots.join(', ')}`,
			{
				data: {
					missing_slots: missingSlots,
					received_slots: systems.map((system) => system.slot),
				},
			}
		);
	}

	return slots as SystemSlots;
}

/**
 * @throws {HelmError} Safe, user-facing error wrapping the underlying cause.
 */
export function expectLoadout(
	state: State,
	select: typeof globalSelect
): ShipLoadout {
	try {
		const ship = state.shipState;
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
