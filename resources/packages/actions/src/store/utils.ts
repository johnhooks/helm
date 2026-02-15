import { addQueryArgs } from '@wordpress/url';

/**
 * Build the query key for the actions index endpoint.
 *
 * The key is the REST API path — e.g. `/helm/v1/ships/1/actions`.
 * When filters are added, they'll be folded into the path as query args,
 * giving each unique filter combination its own key in `queries` / `meta`.
 */
export function createIndexQueryId( shipId: number, params?: Record< string, unknown > ): string {
	const path = `/helm/v1/ships/${ shipId }/actions`;
	return params ? addQueryArgs( path, params ) : path;
}
