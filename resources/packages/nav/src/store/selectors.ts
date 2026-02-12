import { createSelector } from '@wordpress/data';
import type { HelmError } from '@helm/errors';
import type { StarNode } from '@helm/types';
import type { State, SyncResult } from './types';

export const getStarNodes = createSelector(
	( state: State ): StarNode[] => Object.values( state.stars.byId ),
	( state: State ) => [ state.stars.byId ],
);

export const getNode = ( state: State, nodeId: number ): StarNode | undefined =>
	state.stars.byId[ nodeId ];

export const getSyncStatus = ( state: State ): State[ 'stars' ][ 'syncStatus' ] =>
	state.stars.syncStatus;

export const getSyncResult = ( state: State ): SyncResult | null =>
	state.stars.syncResult;

export const getError = ( state: State ): HelmError | null => state.stars.error;
