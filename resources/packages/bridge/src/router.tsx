/**
 * TanStack Router configuration.
 *
 * Uses query-param routing (?path=) so it coexists with WordPress's own
 * URL structure. Fullscreen mode is a search param that can be applied to
 * any route.
 */
import { Suspense, useEffect } from '@wordpress/element';
import {
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	useSearch,
} from '@tanstack/react-router';
import { ErrorBoundary } from 'react-error-boundary';
import { HelmErrorPageFallback } from '@helm/shell';
import { ShipProvider } from '@helm/ships';
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
		const shipId = window.helm.settings.shipId;

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
				<ErrorBoundary FallbackComponent={ HelmErrorPageFallback }>
					<Suspense fallback={ null }>
						<ShipProvider shipId={ shipId }>
							<Outlet />
						</ShipProvider>
					</Suspense>
				</ErrorBoundary>
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
