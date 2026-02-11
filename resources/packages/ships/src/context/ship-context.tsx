import { createContext, useContext } from '@wordpress/element';
import { useSelect, useSuspenseSelect } from '@wordpress/data';
import { assert } from '@helm/errors';
import type { ShipState, SystemComponentResponse, WithRestLinks } from '@helm/types';
import { store } from '../store';

export interface ShipContextValue {
	shipId: number;
	ship: WithRestLinks< ShipState >;
	systems: SystemComponentResponse[];
}

const ShipContext = createContext< ShipContextValue | null >( null );

/**
 * Provides resolved ship data to the component tree.
 *
 * Suspends until the ship resolver completes. Systems arrive via the ship
 * fetch embed; the getSystems resolver also fires to populate products.
 *
 * Must be wrapped in `<Suspense>` + `<ErrorBoundary>`.
 */
export function ShipProvider( {
	shipId,
	children,
}: {
	shipId: number;
	children: React.ReactNode;
} ) {
	const ship = useSuspenseSelect(
		( select ) => select( store ).getShip( shipId ),
		[ shipId ],
	);

	// Systems arrive immediately via the ship embed; the resolver also
	// fires in the background to fetch with _embed for products.
	const systems = useSelect(
		( select ) => select( store ).getSystems( shipId ),
		[ shipId ],
	);

	assert( ship, 'helm.ship.not_found', 'Ship data was not found after resolution.' );
	assert( systems, 'helm.ship.systems_not_found', 'Ship systems were not found after resolution.' );

	return (
		<ShipContext.Provider value={ { shipId, ship, systems } }>
			{ children }
		</ShipContext.Provider>
	);
}

/**
 * Access ship data from the nearest ShipProvider.
 *
 * All values are guaranteed non-null — the provider asserts existence.
 */
export function useShip(): ShipContextValue {
	const context = useContext( ShipContext );
	assert( context, 'helm.ship.no_provider', 'useShip must be used within a ShipProvider.' );
	return context;
}
