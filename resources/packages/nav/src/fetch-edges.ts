import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { ErrorCode, HelmError } from '@helm/errors';
import type { UserEdge } from '@helm/types';

const PER_PAGE = 500;

export interface EdgeFreshness {
	count: number;
	lastDiscovered: string;
}

/**
 * Fetch freshness metadata for the authenticated user's discovered edges.
 *
 * @internal
 */
export async function fetchEdgeFreshness(): Promise< EdgeFreshness > {
	try {
		const response = await apiFetch( {
			path: '/helm/v1/edges?per_page=1&page=1',
			method: 'HEAD',
			parse: false,
		} );

		return {
			count: Number( response.headers.get( 'X-WP-Total' ) ?? 0 ),
			lastDiscovered: response.headers.get( 'X-Helm-Edge-Last-Discovered' ) ?? '',
		};
	} catch ( error ) {
		throw HelmError.safe(
			ErrorCode.CacheFetchFailed,
			__( 'Failed to fetch edge freshness from the server.', 'helm' ),
			error,
		);
	}
}

/**
 * Fetch all discovered user edges from the REST API.
 *
 * Uses `parse: false` to access pagination headers, then parses JSON manually.
 * Pages are fetched sequentially to avoid hammering the server.
 *
 * @internal
 */
export async function fetchAllEdges(): Promise< UserEdge[] > {
	const allEdges: UserEdge[] = [];
	let page = 1;
	let totalPages = 1;

	try {
		do {
			const response = await apiFetch( {
				path: `/helm/v1/edges?per_page=${ PER_PAGE }&page=${ page }`,
				parse: false as const,
			} );

			totalPages = Number( response.headers.get( 'X-WP-TotalPages' ) ) || 1;

			const edges: UserEdge[] = await response.json();
			allEdges.push( ...edges );

			page++;
		} while ( page <= totalPages );
	} catch ( error ) {
		throw HelmError.safe(
			ErrorCode.CacheFetchFailed,
			__( 'Failed to fetch edge data from the server.', 'helm' ),
			error,
		);
	}

	return allEdges;
}

export function getLastDiscoveredFromEdges( edges: UserEdge[] ): string {
	return edges.reduce(
		( latest, edge ) => edge.discovered_at > latest ? edge.discovered_at : latest,
		'',
	);
}
