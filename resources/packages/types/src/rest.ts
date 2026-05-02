/**
 * WP REST link relation identifiers registered by the Helm plugin.
 */
export const LinkRel = {
	Product: 'helm:product',
	Stars: 'helm:stars',
	Systems: 'helm:systems',
} as const;

export type LinkRel = (typeof LinkRel)[keyof typeof LinkRel];

/**
 * WP REST API link object.
 */
export interface RestLink {
	href: string;
	embeddable?: boolean;
}

/**
 * WP REST API `_links` shape — a map of link relations to link arrays.
 */
export type RestLinks = Record<string, RestLink[]>;

/**
 * Adds WP REST `_links` to any response type.
 */
export type WithRestLinks<T> = T & { _links?: RestLinks };

/**
 * Adds WP REST `_embedded` to any response type.
 */
export type WithRestEmbeds<T, E> = T & { _embedded?: E };

/**
 * Filter operators — subset of `@wordpress/dataviews` `Operator` that maps to
 * our PHP `FilterOpType` enum.  Expand as needed.
 */
export type Operator = 'is' | 'isNot' | 'isAny' | 'isNone';

/**
 * A single filter criterion, mirroring `@wordpress/dataviews` `Filter`.
 */
export interface Filter {
	field: string;
	operator: Operator;
	value: unknown;
}

/**
 * Common query parameters for a single-resource REST request.
 */
export interface QueryParams {
	_embed?: string[];
}

/**
 * Query parameters for list (collection) REST requests.
 */
export interface ListQueryParams extends QueryParams {
	page: number;
	per_page: number;
	search?: string;
	filters?: Filter[];
}

/**
 * Pagination metadata returned alongside a collection response.
 */
export interface ResponseMeta {
	totalItems: number;
	totalPages: number;
}
