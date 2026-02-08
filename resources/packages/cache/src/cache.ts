import type { Datacore } from '@helm/datacore';
import { syncNodes } from './sync';
import { META_SYNCED_AT } from './types';
import type { Cache, CacheOptions, SyncResult } from './types';

/**
 * Create a Cache instance bound to a Datacore connection.
 *
 * The cache orchestrates syncing data from the REST API into the local
 * SQLite store and exposes sync state for UI consumption.
 *
 * @param options Cache configuration including the datacore instance.
 */
export function createCache(options: CacheOptions): Cache {
	const { datacore }: { datacore: Datacore } = options;

	return {
		syncNodes(): Promise<SyncResult> {
			return syncNodes(datacore);
		},

		async lastSyncedAt(): Promise<string | null> {
			return datacore.getMeta(META_SYNCED_AT);
		},

		async isSynced(): Promise<boolean> {
			const value = await datacore.getMeta(META_SYNCED_AT);
			return value !== null;
		},
	};
}
