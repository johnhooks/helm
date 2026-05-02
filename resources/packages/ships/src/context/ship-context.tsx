import { createContext, useContext } from '@wordpress/element';
import { useSelect, useSuspenseSelect } from '@wordpress/data';
import { assert, ErrorCode, HelmError } from '@helm/errors';
import { __ } from '@wordpress/i18n';
import type {
	ShipState,
	SystemComponentResponse,
	WithRestLinks,
} from '@helm/types';
import { store } from '../store';

export interface ShipContextValue {
	shipId: number;
	ship: WithRestLinks<ShipState>;
	systems: SystemComponentResponse[];
}

const ShipContext = createContext<ShipContextValue | null>(null);

/**
 * Provides resolved ship data to the component tree.
 *
 * Suspends until the ship resolver completes. Systems arrive via the ship
 * fetch embed; the getSystems resolver also fires to populate products.
 *
 * Must be wrapped in `<Suspense>` + `<ErrorBoundary>`.
 */
export function ShipProvider({
	shipId,
	children,
}: {
	shipId: number | null | undefined;
	children: React.ReactNode;
}) {
	assert(
		shipId,
		ErrorCode.ShipsNoProvider,
		'ShipProvider requires a shipId.'
	);
	const ship = useSuspenseSelect(
		(select) => select(store).getShip(shipId),
		[shipId]
	);

	// Systems arrive immediately via the ship embed; the resolver also
	// fires in the background to fetch with _embed for products.
	const systems = useSelect(
		(select) => select(store).getSystems(shipId),
		[shipId]
	);

	if (!ship) {
		throw HelmError.safe(
			ErrorCode.ShipsUnavailable,
			__('Ship link connection lost — ship state unavailable', 'helm')
		);
	}
	if (!systems) {
		throw HelmError.safe(
			ErrorCode.ShipsSystemsUnavailable,
			__('Ship link connection lost — system data unavailable', 'helm')
		);
	}

	return (
		<ShipContext.Provider value={{ shipId, ship, systems }}>
			{children}
		</ShipContext.Provider>
	);
}

/**
 * Access ship data from the nearest ShipProvider.
 *
 * All values are guaranteed non-null — the provider asserts existence.
 */
export function useShip(): ShipContextValue {
	const context = useContext(ShipContext);
	assert(
		context,
		ErrorCode.ShipsNoProvider,
		'useShip must be used within a ShipProvider.'
	);
	return context;
}
