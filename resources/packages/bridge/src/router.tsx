/**
 * TanStack Router configuration.
 *
 * Uses query-param routing (?path=) so it coexists with WordPress's own
 * URL structure. Fullscreen mode is a search param that can be applied to
 * any route.
 */
import { useEffect } from 'react';
import {
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	useSearch,
} from '@tanstack/react-router';
import { createWpHistory } from '@helm/router';
import { AppRoot } from '@helm/ui';
import { BridgePage } from './routes/bridge';

type RootSearch = {
	fullscreen?: boolean;
};

const rootRoute = createRootRoute({
	validateSearch: (search: Record<string, unknown>): RootSearch => {
		if (
			search.fullscreen === true ||
			search.fullscreen === 'true' ||
			search.fullscreen === ''
		) {
			return { fullscreen: true };
		}
		return {};
	},
	component: function RootLayout() {
		const { fullscreen } = useSearch({ from: rootRoute.id });

		useEffect(() => {
			if (fullscreen) {
				document.documentElement.classList.add('helm-fullscreen');
			}
			return () => {
				document.documentElement.classList.remove('helm-fullscreen');
			};
		}, [fullscreen]);

		return (
			<AppRoot>
				<Outlet />
			</AppRoot>
		);
	},
});

const bridgeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	component: BridgePage,
});

const routeTree = rootRoute.addChildren([bridgeRoute]);

export const router = createRouter({
	routeTree,
	history: createWpHistory(),
});
