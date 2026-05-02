import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { ErrorCode, HelmError } from '@helm/errors';
import { LinkRel } from '@helm/types';
import type { ApiNodeResponse } from '@helm/types';

const PER_PAGE = 500;

/**
 * Fetch all nodes (with embedded stars) from the REST API.
 *
 * Uses `parse: false` to access pagination headers, then parses JSON manually.
 * Pages are fetched sequentially to avoid hammering the server.
 *
 * @internal
 */
export async function fetchAllNodes(): Promise<ApiNodeResponse[]> {
	const allNodes: ApiNodeResponse[] = [];
	let page = 1;
	let totalPages = 1;

	try {
		do {
			const response = await apiFetch({
				path: `/helm/v1/nodes?_embed=${LinkRel.Stars}&per_page=${PER_PAGE}&page=${page}`,
				parse: false as const,
			});

			totalPages = Number(response.headers.get('X-WP-TotalPages')) || 1;

			const nodes: ApiNodeResponse[] = await response.json();
			allNodes.push(...nodes);

			page++;
		} while (page <= totalPages);
	} catch (error) {
		throw HelmError.safe(
			ErrorCode.CacheFetchFailed,
			__('Failed to fetch node data from the server.', 'helm'),
			error
		);
	}

	return allNodes;
}

/**
 * Fetch a specific set of nodes from the REST API in a single request.
 *
 * @internal
 */
export async function fetchNodesByIds(
	ids: number[]
): Promise<ApiNodeResponse[]> {
	const uniqueIds = [...new Set(ids)];
	if (uniqueIds.length === 0) {
		return [];
	}

	try {
		return await apiFetch<ApiNodeResponse[]>({
			path: `/helm/v1/nodes?include=${uniqueIds.join(',')}`,
		});
	} catch (error) {
		throw HelmError.safe(
			ErrorCode.CacheFetchFailed,
			__('Failed to fetch node data from the server.', 'helm'),
			error
		);
	}
}
