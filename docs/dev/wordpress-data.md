# @wordpress/data API Reference

This document provides a comprehensive reference for the @wordpress/data package, WordPress's centralized state management solution.

## Table of Contents

1. [Core Exports](#core-exports)
2. [Store Creation](#store-creation)
3. [Actions](#actions)
4. [Selectors](#selectors)
5. [Resolvers](#resolvers)
6. [React Integration](#react-integration)
7. [TypeScript Usage](#typescript-usage)
8. [Advanced Patterns](#advanced-patterns)

## Core Exports

### Store Management

```javascript
import {
	createReduxStore, // Create a store descriptor
	register, // Register a store with the registry
	createRegistry, // Create a new registry instance
	combineReducers, // Redux-style reducer combiner
} from '@wordpress/data';
```

### Data Access

**In React components always use React hooks instead of direct store access.** Use `useSelect` and `useDispatch` hooks in React components rather than calling `select` or `dispatch` directly from `@wordpress/data`. Direct access bypasses React's rendering lifecycle and can cause performance issues, unless being used outside of React with a `subscribe` callback.

```javascript
import {
	select, // Access store selectors synchronously,
	dispatch, // Access store actions
	subscribe, // Subscribe to store changes
	resolveSelect, // Select with resolver support (returns Promise)
	suspendSelect, // Select with React Suspense support
} from '@wordpress/data';
```

### React Hooks

```javascript
import {
	useSelect, // Hook to select data from stores
	useSuspenseSelect, // Suspense-enabled version of useSelect
	useDispatch, // Hook to get action dispatchers
	useRegistry, // Hook to access the registry
} from '@wordpress/data';
```

### React Components & HOCs

**Avoid using legacy HOCs in new code.** Use React hooks (`useSelect`, `useDispatch`) instead of the higher-order components marked as legacy below.

```typescript
import {
	withSelect, // ❌ Do not use. HOC for selecting data (legacy)
	withDispatch, // ❌ Do not use. HOC for dispatching actions (legacy)
	withRegistry, // ❌ Do not use. HOC for accessing registry (legacy)
} from '@wordpress/data';
```

## Store Creation

### Basic Store Structure

**CRITICAL: Always organize store components into separate files.** Each store must be split into dedicated files: `actions.ts`, `reducer.ts`, `selectors.ts`, and `resolvers.ts`. This separation of concerns is mandatory for maintainability and follows the established codebase patterns.

```typescript
// In index.ts of the datastore
import { register, createReduxStore } from '@wordpress/data';

import * as actions from './actions';
import { STORE_NAME } from './constants';
import reducer, { initializeDefaultState } from './reducer';
import * as resolvers from './resolvers';
import * as selectors from './selectors';

export const store = createReduxStore(STORE_NAME, {
	actions,
	reducer,
	selectors,
	resolvers,
	initialState: initializeDefaultState(),
});

register(store);
```

### Using combineReducers

**Use combineReducers to organize complex state logic.** When your store has multiple logical sections (e.g., entities, UI, edits), split them into separate reducer functions and combine them. Each reducer will receive all actions dispatched to the store, so ensure they only respond to relevant action types.

```typescript
// In reducer.ts of the datastore.
import { combineReducers } from '@wordpress/data';
import { State, Action } from './types';

function systems(state: State, action: Action) {
	// systems reducer logic
}

function systemEdits(state: State, action: Action) {
	// edits reducer logic
}

export const reducer = combineReducers({
	systems,
	systemEdits,
});
```

## Actions

### Action Conventions

**Important**: Actions should be inlined within thunk actions unless they are intended for use outside the module. This keeps the API surface clean and makes it clear which actions are public vs internal.

### Simple Actions (Only if needed externally)

```typescript
// In actions.ts of the datastore
import { Action } from './types';

export function resetShipState(shipId: number) {
	return {
		type: 'RESET_SHIP_STATE',
		shipId,
	};
}
```

### Async/Await Thunk Actions (Preferred Pattern)

```typescript
// In actions.ts of the datastore.
import { Ship, ShipThunk } from './types';

// Modern async/await pattern with TypeScript
export const startScan: (systemId: number): ShipThunk =>
  async ({ dispatch, select, registry }) => {
    // Inline action dispatches
    dispatch({ type: 'START_SCAN_PENDING' });

    const ship = select.getCurrentShip();

    try {
      const action = await apiFetch<ShipAction>({
        path: '/helm/v1/ship/actions',
        method: 'POST',
        data: { type: 'scan', systemId }
      });

      // Inline the action object
      dispatch({ type: 'START_SCAN_FINISHED', action });

      return action;
    } catch (error) {
      // Handle errors with toErrorMap
      const errors = await toErrorMap(error);

      dispatch({ type: 'START_SCAN_FAILED', systemId, errors });
    }
  };
```

### Generator Actions (Legacy Pattern)

**Avoid using generator actions in new code.** Only use generator functions when working with existing code that already implements this pattern. Prefer async/await syntax for all new action implementations.

### Cross-Store Operations in Thunks

```typescript
// In actions.ts of the datastore
import { Ship, ShipThunk } from './types';
import { store as catalogStore } from '../catalog/store'

// Modern async/await pattern with TypeScript
export const completeDiscovery: (discoveryId: number): ShipThunk =>
  async ({ dispatch, select, registry }) => {
    dispatch({ type: 'COMPLETE_DISCOVERY_START' });

    const discovery = select.getDiscovery(discoveryId);
    // Select from another datastore through the thunk registry prop.
    const existingSystem = registry.select(catalogStore).getSystemById(discovery.systemId);

    try {
      const result = await apiFetch<DiscoveryResult>({
        path: `/helm/v1/discoveries/${discoveryId}/complete`,
        method: 'POST',
      });

      dispatch({ type: 'COMPLETE_DISCOVERY_FINISHED', result });

      // Dispatch to another datastore through the thunk registry prop.
      registry.dispatch(catalogStore).receiveSystem(result.system);
    } catch (error) {
      const errors = await toErrorMap(error);

      dispatch({ type: 'COMPLETE_DISCOVERY_FAILED', discoveryId, errors });
    }
  };
```

## Selectors

### Understanding Selector Stability

**Critical Concept**: Selectors must return stable references. When a selector creates a new object or array (not stored directly in state), it will cause consuming components to re-render on every state change, even if the data hasn't actually changed.

### Basic Selectors (Safe for Direct State Access)

```typescript
// In selectors.ts of the datastore.
import { State } from './types';

// ✅ GOOD: Returns reference from state directly
export function getSystems(state: State) {
	return state.systems; // Direct state reference
}

// ✅ GOOD: Primitive values are always stable
export function getSystemCount(state: State) {
	return state.systems.length; // Primitive number
}

// ✅ GOOD: find() returns existing object reference
export function getSystemById(state: State, id: string) {
	return state.systems.find((system) => system.id === id);
}
```

### Problematic Selectors (Need Memoization)

```typescript
// In selectors.ts of the datastore.
import { State } from './types';

// ❌ BAD: Creates new array on every call
export function getVisitedSystems(state: State) {
	return state.systems.filter((system) => system.visited);
}

// ❌ BAD: Creates new object on every call
export function getSystemsSummary(state: State) {
	return {
		total: state.systems.length,
		visited: state.systems.filter((system) => system.visited).length,
	};
}

// ❌ BAD: map() creates new array with new objects
export function getSystemsWithDistance(state: State) {
	return state.systems.map((system) => ({
		...system,
		distanceFromShip: calculateDistance(
			state.ship.position,
			system.position
		),
	}));
}
```

### Memoized Selectors with createSelector (rememo)

```typescript
// In selectors.ts of the datastore.
import { createSelector } from '@wordpress/data'; // Uses rememo internally

import { State } from './types';

// ✅ GOOD: Memoized filter - returns same array reference if dependencies unchanged
export const getVisitedSystems = createSelector(
	(state: State) => state.systems.filter((system) => system.visited),
	(state: State) => [state.systems] // Dependencies
);

// ✅ GOOD: Memoized computed object
export const getSystemsSummary = createSelector(
	(state: State) => ({
		total: state.systems.length,
		visited: state.systems.filter((system) => system.visited).length,
		reachable: state.systems.filter((system) => system.inRange).length,
	}),
	(state: State) => [state.systems] // Recomputes only when systems change
);

// ✅ GOOD: Memoized selector with arguments
export const getSystemsBySpectralClass = createSelector(
	(state: State, spectralClass: string) => {
		return state.systems.filter(
			(system) => system.star.spectralClass === spectralClass
		);
	},
	// Dependencies include both state and arguments
	(state: State, spectralClass: string) => [state.systems, spectralClass]
);

// ✅ GOOD: Memoized transformation
export const getSystemsWithComputedFields = createSelector(
	(state: State) =>
		state.systems.map((system) => ({
			...system,
			displayName: `${system.name} (${system.star.spectralClass})`,
			isReachable: system.distance <= state.ship.jumpRange,
		})),
	(state) => [state.systems, state.ship.jumpRange]
);

// ✅ GOOD: Multiple dependencies
export const getReachableSystemsForShip = createSelector(
	(state: State) => {
		const { position, jumpRange } = state.ship;

		return state.systems.filter(
			(system) =>
				calculateDistance(position, system.position) <= jumpRange
		);
	},
	(state) => [state.systems, state.ship.position, state.ship.jumpRange]
);
```

### Registry Selectors (Cross-Store)

```typescript
// In selectors.ts of the datastore.
import { createRegistrySelector } from '@wordpress/data';

import { store as catalogStore } from '../catalog/store';

import { State } from './types';

export const getActiveActionsWithSystems = createRegistrySelector(
	(select) => (state: State) => {
		const actions = state.activeActions;

		return actions.map((action) => ({
			...action,
			system: select(catalogStore).getSystemById(action.systemId),
		}));
	}
);
```

## Resolvers

**CRITICAL: Resolver names must exactly match their corresponding selector names.** When you create a resolver for a selector, the resolver function name must be identical to the selector function name. This naming convention is how @wordpress/data automatically connects resolvers to selectors.

Resolvers automatically fetch data when selectors are called. Like actions, they should inline dispatches rather than using separate action creators, unless they should be publicly available.

### Basic Collection Resolver

```typescript
// In resolvers.js of the datastore.
import { toErrorMap } from '@api/errors';

import { Star, CatalogThunk, StarListQuery } from './types';

// Resolver function matches selector name
export const getStars =
	(query: StarListQuery): CatalogThunk =>
	async ({ dispatch }) => {
		// Used as the query identifier.
		const queryAsString = addQueryArgs('/helm/v1/stars', query);

		const stars = await apiFetch<Star[]>({ path: queryAsString });

		dispatch.receiveStarsQuery(queryAsString, stars);

		return stars;
	};
```

### Collection Resolver (Error Handling Pattern)

```typescript
// In resolvers.js of the datastore.
import { toErrorMap } from '@api/errors';

import { Star, CatalogThunk, StarListQuery } from './types';

// Resolver function matches selector name
export const getStars =
	(query: StarListQuery): CatalogThunk =>
	async ({ dispatch }) => {
		// Used as the query identifier.
		const queryAsString = addQueryArgs('/helm/v1/stars', query);

		dispatch({
			type: 'FETCH_STARS_START',
			queryId: queryAsString,
		});

		try {
			const stars = await apiFetch<Star[]>({ path: queryAsString });

			dispatch({
				type: 'FETCH_STARS_FINISHED',
				queryId: queryAsString,
				stars,
			});
		} catch (error) {
			// Handle errors properly with toErrorMap
			const errors = await toErrorMap(error);

			dispatch({
				type: 'FETCH_STARS_FAILED',
				queryId: queryAsString,
				errors,
			});
		}
	};
```

### Basic Item Resolver

```typescript
// In resolvers.js of the datastore.
import { toErrorMap } from '@api/errors';

import { System, CatalogThunk } from './types';

// Resolver function matches selector name
export const getSystemById =
	(id: string): CatalogThunk =>
	async ({ dispatch }) => {
		const system = await apiFetch<System>({
			path: `/helm/v1/systems/${id}`,
		});

		dispatch.receiveSystem(system);

		return system;
	};
```

### Item Resolver (Cross-Store)

```typescript
// In resolvers.js of the datastore.
import { toErrorMap } from '@api/errors';

import { store as shipStore } from '../ship/store';

import { System, CatalogThunk } from './types';

// Resolver function matches selector name
export const getSystemById =
	(id: string): CatalogThunk =>
	async ({ dispatch, registry }) => {
		const system = await apiFetch<System>({
			path: `/helm/v1/systems/${id}`,
		});

		dispatch.receiveSystem(system);

		// Update ship store if this is the current system
		const currentSystemId = registry.select(shipStore).getCurrentSystemId();
		if (currentSystemId === id) {
			registry.dispatch(shipStore).receiveCurrentSystem(system);
		}

		return system;
	};
```

### Generator Resolvers (Legacy Pattern)

**Avoid using generator resolvers in new code.** Only use generator functions when working with existing legacy code that already implements this pattern. Prefer async/await syntax for all new resolver implementations.

## React Integration

### useSelect Hook and Selector Stability

```tsx
// Return a single selector value
const visitedSystems = useSelect(
	(select) => select(catalogStore).getVisitedSystems(),
	[]
);

// Return multiple selector values
const { systems, shipPosition } = useSelect((select) => ({
	systems: select(catalogStore).getSystems(),
	shipPosition: select(shipStore).getPosition(),
}));

// With dependencies
const [spectralClass, setSpectralClass] = useState('G');

const filteredSystems = useSelect(
	(select) => select(catalogStore).getSystemsBySpectralClass(spectralClass),
	[spectralClass]
);
```

### useDispatch Hook

```tsx
const { startScan, setDestination } = useDispatch(shipStore);
```

### Combined Usage

```tsx
export default function SystemDetail({ systemId }) {
	const system = useSelect(
		(select) => select(catalogStore).getSystemById(systemId),
		[systemId]
	);

	const { startScan, setDestination } = useDispatch(shipStore);

	const handleScan = () => {
		startScan(systemId);
	};

	const handleTravel = () => {
		setDestination(systemId);
	};

	return (
		<Panel variant="bordered" tone="sky">
			<TitleBar
				title={system.name}
				subtitle={system.star.spectralClass}
			/>
			<Button onClick={handleScan}>Scan System</Button>
			<Button onClick={handleTravel}>Set Course</Button>
		</Panel>
	);
}
```

## TypeScript Usage

### Store Type Definitions

```typescript
// types.ts in the datastore.
import {
	StoreDescriptor,
	ReduxStoreConfig,
} from '@wordpress/data/build-types/redux-store';

import type { ErrorMap } from '@api/types';
import { Thunk } from '@utils/data/types';

import { System, Star } from '../types'; // Import main type from module root.

import * as actions from './actions';
import * as selectors from './selectors';

// Define state shape
interface State {
	systems: {
		byId: Record<string, System>;
		queries: Record<string, string[]>;
	};
	stars: {
		byId: Record<string, Star>;
		allIds: string[];
	};
	ui: {
		pendingQueries: Record<string, boolean>;
		errors: Record<string, ErrorMap>;
	};
}

export type Action =
	| {
			type: 'RECEIVE_STARS_QUERY';
			stars: Star[];
			queryId: string;
	  }
	| {
			type: 'RECEIVE_SYSTEM';
			system: System;
	  }
	| {
			type: 'FETCH_STARS_START';
			queryId: string;
	  }
	| {
			type: 'FETCH_STARS_FINISHED';
			queryId: string;
			stars: Star[];
	  }
	| {
			type: 'FETCH_STARS_FAILED';
			queryId: string;
			errors: ErrorMap;
	  };

export type CatalogThunk = Thunk<
	Action,
	StoreDescriptor<ReduxStoreConfig<State, typeof actions, typeof selectors>>
>;
```

### Invalidating Resolutions

#### In Async/Await Thunks (TypeScript)

```typescript
const actions = {
	discoverSystem:
		(id: string, data: any): Thunk<Action, Store> =>
		async ({ dispatch }) => {
			dispatch({ type: 'DISCOVER_SYSTEM', id, data });

			// Invalidate a single selector
			dispatch.invalidateResolution('getSystemById', [id]);

			// Or invalidate all resolutions
			dispatch.invalidateResolutionForStore();
		},
};
```

## Common Gotchas

1. **Resolvers are called automatically** - Don't call resolvers directly
2. **Actions must be serializable** - Don't put functions in action objects
3. **Generator actions are promisified** - They return Promises when dispatched
4. **Selectors should be pure** - No side effects in selectors

## Best Practices

1. **Use async/await over generators** - Modern pattern that's easier to read and debug
2. **Inline action dispatches** - Only create separate action creators for actions used outside the module
3. **Always use createSelector for derived data** - Any selector that creates new objects/arrays must be memoized
4. **Ensure selector stability** - Unstable selectors cause unnecessary React re-renders
5. **Handle errors with toErrorMap** - Consistent error handling across the app
6. **Type your stores** - Use TypeScript for better developer experience
7. **Keep dependencies accurate** - Include all values that affect selector output
8. **Leverage resolvers** - Automatic data fetching on selector calls
