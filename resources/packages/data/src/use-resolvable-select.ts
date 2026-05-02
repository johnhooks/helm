/**
 * This code is inspired by Gutenberg:
 * https://github.com/WordPress/gutenberg/blob/c97c26fe371e3d40efe197d8f398326a16cdbf46/packages/core-data/src/hooks/use-query-select.ts
 */

import { useSelect } from '@wordpress/data';
import type { StoreDescriptor } from '@wordpress/data';
import type { Resolvable } from './types';

/**
 * WordPress metadata selectors that every store with resolvers gets
 * automatically. Not included in the TS types, so we escape-hatch once here.
 */
interface MetaSelectors {
	getResolutionState: (
		selectorName: string,
		args?: unknown[]
	) => { status: 'resolving' | 'finished' | 'error' } | undefined;
	hasFinishedResolution: (selectorName: string, args?: unknown[]) => boolean;
	isResolving: (selectorName: string, args?: unknown[]) => boolean;
}

type WithMeta<S> = S & MetaSelectors;

const META_KEYS = new Set([
	'getResolutionState',
	'hasFinishedResolution',
	'hasStartedResolution',
	'isResolving',
	'getCachedResolvers',
	'getIsResolving',
]);

/**
 * Maps a StoreDescriptor to its selectors, curried (state removed) with each
 * return type wrapped in Resolvable.
 *
 * Mirrors the pattern of CurriedSelectorsOf from wordpress/data but wraps
 * return values in Resolvable instead of returning them directly.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResolvableSelectorsOf<S> = S extends StoreDescriptor<infer C>
	? C extends { selectors?: infer Sel }
		? {
				[K in keyof Sel]: Sel[K] extends (
					state: any,
					...args: infer A
				) => infer R
					? (...args: A) => Resolvable<R>
					: Sel[K];
		  }
		: never
	: never;

function enrichSelectors<
	S extends Record<string, (...args: unknown[]) => unknown>,
>(
	selectors: WithMeta<S>
): Record<string, (...args: unknown[]) => Resolvable<unknown>> {
	const enriched = {} as Record<string, unknown>;

	for (const name of Object.keys(selectors)) {
		if (META_KEYS.has(name)) {
			continue;
		}

		Object.defineProperty(enriched, name, {
			get:
				() =>
				(...args: unknown[]) => {
					const data = selectors[name](...args);
					const resolution = selectors.getResolutionState(name, args);

					let status: Resolvable<unknown>['status'];
					switch (resolution?.status) {
						case 'resolving':
							status = 'RESOLVING';
							break;
						case 'finished':
							status = 'SUCCESS';
							break;
						case 'error':
							status = 'ERROR';
							break;
						default:
							status = 'IDLE';
					}

					return {
						data,
						status,
						isResolving: status === 'RESOLVING',
						hasResolved: status === 'SUCCESS' || status === 'ERROR',
					};
				},
		});
	}

	return enriched as Record<
		string,
		(...args: unknown[]) => Resolvable<unknown>
	>;
}

/**
 * Like `useSelect`, but every selector returns a `Resolvable<Data>` object
 * with resolution metadata (`status`, `isResolving`, `hasResolved`).
 *
 * The type escape-hatch for WP metadata selectors lives here so consumers
 * don't need to cast anything.
 *
 * ```ts
 * const { data: ship, hasResolved } = useResolvableSelect(
 *     (resolve) => resolve(shipsStore).getShip(shipId),
 *     [shipId],
 * );
 * ```
 */
export function useResolvableSelect<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Result extends Resolvable<any> | Record<string, Resolvable<any>>,
>(
	mapSelect: (
		resolve: <S extends StoreDescriptor>(
			store: S
		) => ResolvableSelectorsOf<S>
	) => Result,
	deps: unknown[]
): Result {
	return useSelect(
		(select) => {
			const resolve = (store: StoreDescriptor) =>
				enrichSelectors(
					select(store) as WithMeta<
						Record<string, (...a: unknown[]) => unknown>
					>
				);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return mapSelect(resolve as any);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		deps
	);
}
