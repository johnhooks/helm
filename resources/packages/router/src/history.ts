/**
 * WordPress query-param history for TanStack Router.
 *
 * Routes are stored in a `path` query parameter alongside WordPress's own
 * `page` param, matching the pattern used by Gutenberg's router and
 * iThemes Security:
 *
 *   admin.php?page=helm                        → /
 *   admin.php?page=helm&path=/scan/123         → /scan/123
 *   admin.php?page=helm&path=/scan&fullscreen  → /scan?fullscreen
 *
 * TanStack Router sees a normal pathname + search string. WordPress sees
 * its own `page` param untouched.
 */
import { createBrowserHistory } from '@tanstack/react-router';

const PATH_PARAM = 'path';

export function createWpHistory() {
	return createBrowserHistory({
		parseLocation: () => {
			const params = new URLSearchParams(window.location.search);
			const pathname = params.get(PATH_PARAM) || '/';

			// Everything except WordPress's `page` and our `path` param
			// belongs to TanStack Router's search state.
			const search = new URLSearchParams();
			params.forEach((value, key) => {
				if (key !== 'page' && key !== PATH_PARAM) {
					search.set(key, value);
				}
			});
			const searchStr = search.toString()
				? `?${search.toString()}`
				: '';

			return {
				href: `${pathname}${searchStr}`,
				pathname,
				search: searchStr,
				hash: '',
				state: window.history.state ?? {},
			};
		},

		createHref: (href) => {
			const qIdx = href.indexOf('?');
			const pathname = qIdx > -1 ? href.slice(0, qIdx) : href;
			const tanstackSearch = qIdx > -1 ? href.slice(qIdx + 1) : '';

			// Preserve WordPress's page param, add our path + TanStack search.
			// Boolean flags (value "true") are written as bare keys (&fullscreen
			// instead of &fullscreen=true) for cleaner URLs.
			const wpPage = new URLSearchParams(
				window.location.search,
			).get('page');
			const parts: string[] = [];

			if (wpPage) {
				parts.push(`page=${encodeURIComponent(wpPage)}`);
			}
			if (pathname && pathname !== '/') {
				parts.push(
					`${PATH_PARAM}=${encodeURIComponent(pathname)}`,
				);
			}
			if (tanstackSearch) {
				new URLSearchParams(tanstackSearch).forEach((value, key) => {
					if (value === 'true') {
						parts.push(encodeURIComponent(key));
					} else {
						parts.push(
							`${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
						);
					}
				});
			}

			return `${window.location.pathname}?${parts.join('&')}`;
		},
	});
}
