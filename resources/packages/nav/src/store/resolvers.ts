import type {Thunk} from '@helm/types';
import type {Action} from './types';
import type {store} from './index';
import { createGraphReadKey } from './selectors';

export const getStarNodes =
    (): Thunk<Action, typeof store> =>
        async ({dispatch, select}) => {
            const status = select.getSyncStatus();

            // Already loaded, in-flight, or failed this session.
            if (status === 'synced' || status === 'syncing' || status === 'error') {
                return;
            }

            // Try loading from persisted datacore (OPFS).
            await dispatch.hydrate();
            if (select.getSyncStatus() === 'synced') {
                await dispatch.syncUserEdgesIfStale();
                return;
            }

            // Nothing cached — full sync from REST.
            await dispatch.syncNodes();
        };

export const hasDirectEdgeBetween =
    (fromNodeId: number, targetNodeId: number): Thunk<Action, typeof store> =>
        async ({dispatch, select}) => {
            if (select.hasDirectEdgeBetween(fromNodeId, targetNodeId) !== undefined) {
                return;
            }

            const dc = await dispatch.initialize();
            const hasDirectEdge = await dc.hasDirectEdgeBetween(fromNodeId, targetNodeId);

            dispatch({
                type: 'DIRECT_EDGE_READ_FINISHED',
                key: createGraphReadKey(fromNodeId, targetNodeId),
                hasDirectEdge,
            });
        };

export const findKnownPath =
    (fromNodeId: number, targetNodeId: number): Thunk<Action, typeof store> =>
        async ({dispatch, select}) => {
            if (select.findKnownPath(fromNodeId, targetNodeId) !== undefined) {
                return;
            }

            const dc = await dispatch.initialize();
            const path = await dc.findKnownPath(fromNodeId, targetNodeId);

            dispatch({
                type: 'KNOWN_PATH_READ_FINISHED',
                key: createGraphReadKey(fromNodeId, targetNodeId),
                path,
            });
        };
