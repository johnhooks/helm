import { createSelector } from '@wordpress/data';
import { assert, ErrorCode } from '@helm/errors';
import type { HelmError } from '@helm/errors';
import type { KnownPathResult } from '@helm/datacore';
import type { StarNode } from '@helm/types';
import type { State, SyncResult } from './types';

export function createGraphReadKey( fromNodeId: number, targetNodeId: number ): string {
	return `${ fromNodeId }:${ targetNodeId }`;
}

export const getStarNodes = createSelector(
	( state: State ): StarNode[] => Object.values( state.stars.byId ),
	( state: State ) => [ state.stars.byId ],
);

export const getNode = ( state: State, nodeId: number ): StarNode | undefined =>
	state.stars.byId[ nodeId ];

/**
 * Select a nav node by ID.
 *
 * @throws {HelmError} ErrorCode.NavNodeNotFound when the node is missing.
 */
export const expectNode = ( state: State, nodeId: number ): StarNode => {
	const node = state.stars.byId[ nodeId ];
	assert( node, ErrorCode.NavNodeNotFound, `Nav node not found: ${ nodeId }` );
	return node;
};

export const getSyncStatus = ( state: State ): State[ 'stars' ][ 'syncStatus' ] =>
	state.stars.syncStatus;

export const getSyncResult = ( state: State ): SyncResult | null =>
	state.stars.syncResult;

export const getError = ( state: State ): HelmError | null => state.stars.error;

export const hasDirectEdgeBetween = (
	state: State,
	fromNodeId: number,
	targetNodeId: number,
): boolean | undefined => state.graph.directEdges[ createGraphReadKey( fromNodeId, targetNodeId ) ];

export const findKnownPath = (
	state: State,
	fromNodeId: number,
	targetNodeId: number,
): KnownPathResult | undefined => state.graph.knownPaths[ createGraphReadKey( fromNodeId, targetNodeId ) ];
