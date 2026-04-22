import { __ } from '@wordpress/i18n';
import { createDatacore } from '@helm/datacore';
import { ErrorCode, HelmError } from '@helm/errors';
import type { Datacore } from '@helm/datacore';
import type { Thunk } from '@helm/types';
import type { Action } from './types';
import type { store } from './index';
import {
	syncNodes as syncNodesToDatacore,
	META_SYNCED_AT,
	META_NODE_COUNT,
	META_STAR_COUNT,
	META_WAYPOINT_COUNT,
	META_EDGE_COUNT,
} from '../sync';

/**
 * Module-level datacore singleton — not stored in Redux state.
 *
 * This is a live Web Worker connection. Actions write to it,
 * selectors never see it.
 */
let datacore: Datacore | null = null;
let initPromise: Promise< Datacore > | null = null;

/**
 * Boot the datacore (idempotent).
 *
 * Returns the Datacore instance for callers that need direct access
 * (e.g. settings page reading meta). Most consumers should use
 * selectors instead.
 */
export const initialize =
	(): Thunk< Action, typeof store, Datacore > =>
	async () => {
		if ( datacore ) {
			return datacore;
		}

		if ( initPromise ) {
			return initPromise;
		}

		initPromise = createDatacore( {
			workerUrl: window.helm.settings.workerUrl,
			userId: window.helm.settings.userId,
		} );

		try {
			datacore = await initPromise;
			return datacore;
		} catch ( error ) {
			initPromise = null;
			throw error;
		}
	};

/**
 * Hydrate state from the datacore's persisted data (no network).
 *
 * Checks the datacore's meta for a previous sync timestamp. If found,
 * loads the star map and sync result into Redux state. If nothing is
 * cached, this is a no-op — check syncStatus after to decide next step.
 */
export const hydrate =
	(): Thunk< Action, typeof store > =>
	async ( { dispatch } ) => {
		const dc = await dispatch.initialize();
		const syncedAt = await dc.getMeta( META_SYNCED_AT );

		if ( ! syncedAt ) {
			return;
		}

		const nodeCount = await dc.getMeta( META_NODE_COUNT );
		const starCount = await dc.getMeta( META_STAR_COUNT );
		const waypointCount = await dc.getMeta( META_WAYPOINT_COUNT );
		const edgeCount = await dc.getMeta( META_EDGE_COUNT );
		const nodes = await dc.getStarMap();

		dispatch( {
			type: 'SYNC_FINISHED',
			nodes,
			syncResult: {
				nodes: Number( nodeCount ?? 0 ),
				stars: Number( starCount ?? 0 ),
				waypoints: Number( waypointCount ?? 0 ),
				edges: Number( edgeCount ?? 0 ),
				syncedAt,
			},
		} );
	};

/**
 * Fetch all nav data from REST, write to datacore, load star map into state.
 */
export const syncNodes =
	(): Thunk< Action, typeof store > =>
	async ( { dispatch } ) => {
		dispatch( { type: 'SYNC_START' } );

		try {
			const dc = await dispatch.initialize();
			const syncResult = await syncNodesToDatacore( dc );

			const nodes = await dc.getStarMap();

			dispatch( {
				type: 'SYNC_FINISHED',
				nodes,
				syncResult,
			} );
		} catch ( error ) {
			const helmError = error instanceof HelmError
				? error
				: HelmError.safe(
					ErrorCode.CacheSyncFailed,
					__( 'Failed to sync navigation data.', 'helm' ),
					error,
				);

			dispatch( { type: 'SYNC_FAILED', error: helmError } );
			throw helmError;
		}
	};

/**
 * Get the underlying Datacore instance.
 *
 * Initializes if needed. For callers that need direct datacore access
 * (e.g. reading meta values).
 */
export const getDatacore =
	(): Thunk< Action, typeof store, Datacore > =>
	async ( { dispatch } ) => {
		return dispatch.initialize();
	};
