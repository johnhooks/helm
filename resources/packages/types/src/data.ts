import type {
	ActionCreatorsOf,
	AnyConfig,
	CurriedSelectorsOf,
	StoreDescriptor,
} from '@wordpress/data';

/**
 * Base action shape — equivalent to redux Action.
 */
interface ReduxAction {
	type: string;
}

/**
 * Metadata action creators available on every store dispatch.
 */
type MetadataActionCreators = {
	invalidateResolution: (
		selectorName: string,
		args: unknown[]
	) => {
		readonly type: 'INVALIDATE_RESOLUTION';
		readonly selectorName: string;
		readonly args: unknown[];
	};
	invalidateResolutionForStore: () => {
		readonly type: 'INVALIDATE_RESOLUTION_FOR_STORE';
	};
	invalidateResolutionForStoreSelector: (selectorName: string) => {
		readonly type: 'INVALIDATE_RESOLUTION_FOR_STORE_SELECTOR';
		readonly selectorName: string;
	};
};

/**
 * Dispatchable metadata actions.
 */
type MetadataAction =
	| {
			readonly type: 'INVALIDATE_RESOLUTION';
			readonly selectorName: string;
			readonly args: unknown[];
	  }
	| { readonly type: 'INVALIDATE_RESOLUTION_FOR_STORE' }
	| {
			readonly type: 'INVALIDATE_RESOLUTION_FOR_STORE_SELECTOR';
			readonly selectorName: string;
	  };

export type PromisifiedSelectorsOf<S> = S extends StoreDescriptor<AnyConfig>
	? {
			[key in keyof CurriedSelectorsOf<S>]: PromisifySelectorOf<
				CurriedSelectorsOf<S>[key]
			>;
	  }
	: never;

type PromisifySelectorOf<F extends Function> = F extends (
	...args: infer P
) => infer R
	? (...args: P) => Promise<R>
	: F;

/**
 * Dispatchable action creators for a store descriptor.
 */
export type RegistryDispatch<S extends string | StoreDescriptor<AnyConfig>> = (
	storeNameOrDescriptor: S
) => S extends StoreDescriptor<infer C>
	? ActionCreatorsOf<C> & MetadataActionCreators
	: unknown;

/**
 * Selectors for a store descriptor.
 */
export type RegistrySelect<S extends string | StoreDescriptor<AnyConfig>> = (
	storeNameOrDescriptor: S
) => S extends StoreDescriptor<infer C> ? CurriedSelectorsOf<C> : unknown;

/**
 * Dispatch an action to the configured store.
 */
export type DispatchFunction<A extends ReduxAction> = (
	action: A | MetadataAction
) => void;

/**
 * A redux store registry.
 */
export type Registry = {
	dispatch: <S extends string | StoreDescriptor<AnyConfig>>(
		storeNameOrDescriptor: S
	) => S extends StoreDescriptor<infer C>
		? ActionCreatorsOf<C> & MetadataActionCreators
		: unknown;
	select: <S extends string | StoreDescriptor<AnyConfig>>(
		storeNameOrDescriptor: S
	) => S extends StoreDescriptor<AnyConfig> ? CurriedSelectorsOf<S> : unknown;
	resolveSelect: <S extends string | StoreDescriptor<AnyConfig>>(
		storeNameOrDescriptor: S
	) => S extends StoreDescriptor<AnyConfig>
		? PromisifiedSelectorsOf<S>
		: unknown;
};

/**
 * Thunk arguments.
 */
export type ThunkArgs<
	A extends ReduxAction,
	S extends StoreDescriptor<AnyConfig>,
> = {
	/**
	 * Dispatch an action to the store.
	 */
	dispatch: (S extends StoreDescriptor<infer Config>
		? ActionCreatorsOf<Config> & MetadataActionCreators
		: unknown) &
		DispatchFunction<A>;

	/**
	 * Selectors for the store.
	 */
	select: CurriedSelectorsOf<S>;

	/**
	 * Selectors for the store that return a promise awaiting their resolver.
	 */
	resolveSelect: PromisifiedSelectorsOf<S>;

	/**
	 * The store registry object.
	 */
	registry: Registry;
};

/**
 * Thunk.
 */
export type Thunk<
	A extends ReduxAction,
	S extends StoreDescriptor<AnyConfig>,
	T extends unknown = void,
> = T extends Awaited<infer R>
	? (args: ThunkArgs<A, S>) => Promise<R>
	: (args: ThunkArgs<A, S>) => T;
