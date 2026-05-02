import { __ } from '@wordpress/i18n';
import { HelmError } from './helm-error';

const DEFAULT_CODE = 'helm.assert';
const DEFAULT_MESSAGE = __('An expected value was not found.', 'helm');

/**
 * Asserts a value is neither null nor undefined, narrowing the type for TS.
 *
 * Use this in child components that select data a parent already guarantees.
 * The selector may return undefined (TS can't know the parent ensured it), so
 * this bridges the gap between "we know it exists" and "TS knows it exists".
 *
 * ```ts
 * const ship = useSelect( ( select ) => select( shipsStore ).getShip( shipId ), [ shipId ] );
 * assert( ship, 'helm.ship.not_found', 'Ship not found' );
 * // ship is now narrowed to Ship (not Ship | undefined)
 * ```
 */
export function assert<T>(
	value: T | null | undefined,
	code: string = DEFAULT_CODE,
	message: string = DEFAULT_MESSAGE
): asserts value is T {
	if (value === null || value === undefined) {
		throw new HelmError(code, message);
	}
}
