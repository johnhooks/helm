import type { Thunk } from '@helm/types';
import type { Action } from './types';
import type { store } from './index';

export const getStarNodes =
	(): Thunk< Action, typeof store > =>
	async ( { dispatch, select } ) => {
		const status = select.getSyncStatus();

		// Already loaded, in-flight, or failed this session.
		if ( status === 'synced' || status === 'syncing' || status === 'error' ) {
			return;
		}

		// Try loading from persisted datacore (OPFS).
		await dispatch.hydrate();
		if ( select.getSyncStatus() === 'synced' ) {
			return;
		}

		// Nothing cached — full sync from REST.
		await dispatch.syncNodes();
	};
