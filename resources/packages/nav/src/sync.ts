import { __ } from '@wordpress/i18n';
import type { Datacore } from '@helm/datacore';
import { ErrorCode, HelmError } from '@helm/errors';
import { LinkRel } from '@helm/types';
import type { ApiNodeResponse, NavNode, Star } from '@helm/types';
import {
	fetchAllEdges,
	fetchEdgesByIds,
	fetchEdgeFreshness,
	getLastDiscoveredFromEdges,
} from './fetch-edges';
import { fetchAllNodes, fetchNodesByIds } from './fetch-nodes';
import type { SyncResult } from './store/types';

export const META_SYNCED_AT = 'cache.synced_at';
export const META_NODE_COUNT = 'cache.node_count';
export const META_STAR_COUNT = 'cache.star_count';
export const META_WAYPOINT_COUNT = 'cache.waypoint_count';
export const META_EDGE_COUNT = 'cache.edge_count';
export const META_EDGE_LAST_DISCOVERED = 'cache.edge_last_discovered';

export interface EdgeSyncResult {
	refreshed: boolean;
	edges: number;
	lastDiscovered: string;
}

/**
 * Full clear-and-replace sync of nodes, stars, and user edges from the REST API
 * into datacore.
 *
 * Fetch happens outside the transaction — if it fails, the cache is untouched.
 * If any write fails, the transaction rolls back.
 *
 * @internal
 */
export async function syncNodes(datacore: Datacore): Promise<SyncResult> {
	// Fetch outside the transaction so no savepoint is held during network I/O.
	const apiNodes = await fetchAllNodes();
	const userEdges = await fetchAllEdges();

	const nodes: NavNode[] = [];
	const stars: Star[] = [];
	let waypointCount = 0;

	for (const apiNode of apiNodes) {
		nodes.push(toNavNode(apiNode));
		if (apiNode.type === 'waypoint') {
			waypointCount++;
		}

		const embedded = apiNode._embedded?.[LinkRel.Stars];
		if (embedded) {
			stars.push(...embedded);
		}
	}

	const syncedAt = new Date().toISOString();
	const edgeLastDiscovered = getLastDiscoveredFromEdges(userEdges);

	try {
		await datacore.transaction(async () => {
			await datacore.clearUserEdges();
			await datacore.clearStars();
			await datacore.clearNodes();

			await datacore.insertNodes(nodes);
			await datacore.insertStars(stars);
			await datacore.insertUserEdges(userEdges);

			await datacore.setMeta(META_SYNCED_AT, syncedAt);
			await datacore.setMeta(META_NODE_COUNT, String(nodes.length));
			await datacore.setMeta(META_STAR_COUNT, String(stars.length));
			await datacore.setMeta(META_WAYPOINT_COUNT, String(waypointCount));
			await datacore.setMeta(META_EDGE_COUNT, String(userEdges.length));
			await datacore.setMeta(
				META_EDGE_LAST_DISCOVERED,
				edgeLastDiscovered
			);
		});
	} catch (error) {
		if (HelmError.is(error)) {
			throw error;
		}

		throw HelmError.safe(
			ErrorCode.CacheSyncFailed,
			__('Failed to write navigation data to the local cache.', 'helm'),
			error
		);
	}

	return {
		nodes: nodes.length,
		stars: stars.length,
		waypoints: waypointCount,
		edges: userEdges.length,
		syncedAt,
	};
}

/**
 * Refresh user edges only when server freshness differs from local metadata.
 *
 * This intentionally full-replaces user_edges when stale. Incremental edge
 * cursors can be added later if counts make that worth the extra contract.
 *
 * @internal
 */
export async function syncUserEdgesIfStale(
	datacore: Datacore
): Promise<EdgeSyncResult> {
	const [server, localCount, localLastDiscovered] = await Promise.all([
		fetchEdgeFreshness(),
		datacore.getMeta(META_EDGE_COUNT),
		datacore.getMeta(META_EDGE_LAST_DISCOVERED),
	]);

	const local = {
		count: Number(localCount ?? 0),
		lastDiscovered: localLastDiscovered ?? '',
	};

	if (
		local.count === server.count &&
		local.lastDiscovered === server.lastDiscovered
	) {
		return {
			refreshed: false,
			edges: local.count,
			lastDiscovered: local.lastDiscovered,
		};
	}

	const userEdges = await fetchAllEdges();
	const edgeLastDiscovered = getLastDiscoveredFromEdges(userEdges);
	const missingNodes = await fetchMissingEdgeNodes(datacore, userEdges);

	try {
		await datacore.transaction(async () => {
			await datacore.clearUserEdges();
			await datacore.insertNodes(missingNodes.map(toNavNode));
			await datacore.insertUserEdges(userEdges);
			await datacore.setMeta(META_EDGE_COUNT, String(userEdges.length));
			await datacore.setMeta(
				META_EDGE_LAST_DISCOVERED,
				edgeLastDiscovered
			);
		});
	} catch (error) {
		if (HelmError.is(error)) {
			throw error;
		}

		throw HelmError.safe(
			ErrorCode.CacheSyncFailed,
			__('Failed to write edge data to the local cache.', 'helm'),
			error
		);
	}

	return {
		refreshed: true,
		edges: userEdges.length,
		lastDiscovered: edgeLastDiscovered,
	};
}

/**
 * Reconcile specific discovered user edges into datacore.
 *
 * This is the targeted scan-discovery path. The server endpoint remains
 * canonical and user-scoped, so undiscovered or unauthorized edge IDs simply
 * do not come back.
 *
 * @internal
 */
export async function syncUserEdgesByIds(
	datacore: Datacore,
	edgeIds: number[]
): Promise<EdgeSyncResult> {
	const { edges: userEdges, freshness } = await fetchEdgesByIds(edgeIds);
	const missingNodes = await fetchMissingEdgeNodes(datacore, userEdges);

	try {
		await datacore.transaction(async () => {
			await datacore.insertNodes(missingNodes.map(toNavNode));
			await datacore.insertUserEdges(userEdges);
			await datacore.setMeta(META_EDGE_COUNT, String(freshness.count));
			await datacore.setMeta(
				META_EDGE_LAST_DISCOVERED,
				freshness.lastDiscovered
			);
		});
	} catch (error) {
		if (HelmError.is(error)) {
			throw error;
		}

		throw HelmError.safe(
			ErrorCode.CacheSyncFailed,
			__('Failed to write edge data to the local cache.', 'helm'),
			error
		);
	}

	return {
		refreshed: userEdges.length > 0,
		edges: freshness.count,
		lastDiscovered: freshness.lastDiscovered,
	};
}

async function fetchMissingEdgeNodes(
	datacore: Datacore,
	userEdges: Array<{ node_a_id: number; node_b_id: number }>
): Promise<ApiNodeResponse[]> {
	const referencedNodeIds = [
		...new Set(
			userEdges.flatMap((edge) => [edge.node_a_id, edge.node_b_id])
		),
	];

	const missingNodeIds: number[] = [];
	for (const nodeId of referencedNodeIds) {
		if (!(await datacore.getNode(nodeId))) {
			missingNodeIds.push(nodeId);
		}
	}

	return fetchNodesByIds(missingNodeIds);
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
