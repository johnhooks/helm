import { __ } from '@wordpress/i18n';
import type { Datacore } from '@helm/datacore';
import { ErrorCode, HelmError } from '@helm/errors';
import { LinkRel } from '@helm/types';
import type { ApiNodeResponse, NavNode, Star } from '@helm/types';
import { fetchAllNodes } from './fetch-nodes';
import { META_NODE_COUNT, META_STAR_COUNT, META_SYNCED_AT } from './types';
import type { SyncResult } from './types';

/**
 * Full clear-and-replace sync of nodes and stars from the REST API into datacore.
 *
 * Fetch happens outside the transaction — if it fails, the cache is untouched.
 * If any write fails, the transaction rolls back.
 *
 * @internal
 */
export async function syncNodes(datacore: Datacore): Promise<SyncResult> {

	// Fetch outside the transaction so no savepoint is held during network I/O.
	const apiNodes = await fetchAllNodes();

	const nodes: NavNode[] = [];
	const stars: Star[] = [];

	for (const apiNode of apiNodes) {
		nodes.push(toNavNode(apiNode));

		const embedded = apiNode._embedded?.[ LinkRel.Stars ];
		if (embedded) {
			stars.push(...embedded);
		}
	}

	const syncedAt = new Date().toISOString();

	try {
		await datacore.transaction(async () => {
			await datacore.clearStars();
			await datacore.clearNodes();

			await datacore.insertNodes(nodes);
			await datacore.insertStars(stars);

			await datacore.setMeta(META_SYNCED_AT, syncedAt);
			await datacore.setMeta(META_NODE_COUNT, String(nodes.length));
			await datacore.setMeta(META_STAR_COUNT, String(stars.length));
		});
	} catch (error) {
		if (HelmError.is(error)) {
			throw error;
		}

		throw HelmError.safe(
			ErrorCode.CacheSyncFailed,
			__('Failed to write node data to the local cache.', 'helm'),
			error,
		);
	}

	return {
		nodes: nodes.length,
		stars: stars.length,
		syncedAt,
	};
}

function toNavNode(apiNode: ApiNodeResponse): NavNode {
	return {
		id: apiNode.id,
		type: apiNode.type,
		x: apiNode.x,
		y: apiNode.y,
		z: apiNode.z,
		created_at: apiNode.created_at,
	};
}
