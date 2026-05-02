import type { StoreDescriptor, ReduxStoreConfig } from '@wordpress/data';
import { createReduxStore, register } from '@wordpress/data';
import { STORE_NAME } from './constants';
import * as actions from './actions';
import { reducer, initializeDefaultState } from './reducer';
import * as selectors from './selectors';
import * as resolvers from './resolvers';
import type { State } from './types';

type Store = StoreDescriptor<
	ReduxStoreConfig<State, typeof actions, typeof selectors>
>;

export const store: Store = createReduxStore(STORE_NAME, {
	actions,
	reducer,
	selectors,
	resolvers,
	initialState: initializeDefaultState(),
});

register(store);
