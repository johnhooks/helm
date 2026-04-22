import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { ErrorCode, HelmError } from '@helm/errors';
import type { UserEdge } from '@helm/types';

const PER_PAGE = 500;

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
