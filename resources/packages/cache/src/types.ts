import type { Datacore } from '@helm/datacore';

export interface CacheOptions {
	datacore: Datacore;
}

export interface Cache {
	syncNodes: () => Promise<SyncResult>;
	lastSyncedAt: () => Promise<string | null>;
	isSynced: () => Promise<boolean>;
}

export interface SyncResult {
	nodes: number;
	stars: number;
	syncedAt: string;
}

/** Meta keys written by cache sync operations. */
export const META_SYNCED_AT = 'cache.synced_at';
export const META_NODE_COUNT = 'cache.node_count';
export const META_STAR_COUNT = 'cache.star_count';
