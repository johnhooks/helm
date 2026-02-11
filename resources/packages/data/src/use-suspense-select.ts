import { useSuspenseSelect as _useSuspenseSelect } from '@wordpress/data';
import type { MapSelect } from '@wordpress/data';

/**
 * Like `useSelect`, but Suspense-enabled: the component suspends until all
 * called selectors have finished resolving.
 *
 * Wrap the consuming component in `<Suspense>` + `<ErrorBoundary>`.
 *
 * ```ts
 * const ship = useSuspenseSelect(
 *     ( select ) => select( shipsStore ).getShip( shipId ),
 *     [ shipId ],
 * );
 * ```
 */
export function useSuspenseSelect< T extends MapSelect >(
	mapSelect: T,
	deps: unknown[],
): ReturnType< T > {
	return _useSuspenseSelect( mapSelect, deps );
}
