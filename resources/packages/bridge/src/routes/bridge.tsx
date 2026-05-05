/**
 * Bridge — astrometric viewport showing the real star map.
 *
 * Star data comes from the nav store, which handles datacore init,
 * sync, and queries behind its resolver. The bridge suspends until
 * the star map is ready, then renders.
 */
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import { useSelect, useSuspenseSelect } from '@wordpress/data';
import { store as navStore } from '@helm/nav';
import { log } from '@helm/logger';
import { Panel, SideDrawer } from '@helm/ui';
import { useShip } from '@helm/ships';
import { store as actionsStore } from '@helm/actions';
import { useNavigationEdges } from '@helm/astrometric';
import type {
	NavigationTargetSelectEvent,
	Position3D,
	Route,
	WaypointNode,
} from '@helm/astrometric';
import { ViewportConfig } from '../components/viewport-config';
import { AstrometricMenu } from '../components/astrometric-menu';
import { ShipSystemsCard } from '../components/ship-systems-card';
import { ShipLog } from '@helm/shell';
import { useBridgeViewportPreferences } from '../hooks/use-bridge-viewport-preferences';

const StarField = lazy(() =>
	import('@helm/astrometric').then((m) => ({ default: m.StarField }))
);
import './bridge.css';

const STAR_SIZE_MULTIPLIER: Record<string, number> = {
	sm: 0.5,
	md: 1,
	lg: 1.5,
};

function distance3D(
	a: { x: number; y: number; z: number },
	b: { x: number; y: number; z: number }
): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function BridgePage() {
	const { shipId, ship } = useShip();
	const currentNodeId = ship.node_id;
	const jumpRange = 7;

	const allStars = useSuspenseSelect(
		(select) => select(navStore).getStarNodes(),
		[]
	);

	const [stars, setStars] = useState(allStars);
	const [targetSelectEvent, setTargetSelectEvent] =
		useState<NavigationTargetSelectEvent | null>(null);
	const [drawerOpen, setDrawerOpen] = useState(true);
	const {
		preferences: viewportPreferences,
		setStarSize,
		setJumpRangeOnly,
		setShowRoutes,
		setShowLabels,
	} = useBridgeViewportPreferences();
	const { starSize, jumpRangeOnly, showRoutes, showLabels } =
		viewportPreferences;

	const selectedTarget = targetSelectEvent?.target ?? null;
	const selectedStar = selectedTarget?.star ?? null;

	const edgeNodes = useSelect(
		(select) => select(navStore).getEdgeNodes(),
		[]
	);

	const {
		routes: navigationRoutes,
		overlays: navigationRouteOverlays,
		nodes: navigationRouteNodes,
	} = useNavigationEdges();

	const handleTargetSelect = useCallback(
		(event: NavigationTargetSelectEvent | null) => {
			setTargetSelectEvent(event);
		},
		[]
	);

	// Keep local filtered state in sync with store data.
	useEffect(() => {
		if (!jumpRangeOnly) {
			setStars(allStars);
		}
	}, [allStars, jumpRangeOnly]);

	// Turn off labels when jump range filter is disabled.
	useEffect(() => {
		if (!jumpRangeOnly) {
			setShowLabels(false);
		}
	}, [jumpRangeOnly, setShowLabels]);

	// Filter stars to jump range client-side — all stars are already in memory.
	useEffect(() => {
		if (allStars.length === 0) {
			return;
		}

		if (!jumpRangeOnly) {
			setStars(allStars);
			return;
		}

		const origin = allStars.find((s) => s.node_id === currentNodeId);
		if (!origin) {
			setStars(allStars);
			return;
		}

		const maxDistSq = jumpRange * jumpRange;
		const filtered = allStars.filter((s) => {
			if (s.node_id === currentNodeId) {
				return true;
			}
			const dx = s.x - origin.x;
			const dy = s.y - origin.y;
			const dz = s.z - origin.z;
			return dx * dx + dy * dy + dz * dz <= maxDistSq;
		});

		log.info('bridge.jumprange.filtered', { count: filtered.length });
		setStars(filtered);
	}, [jumpRangeOnly, currentNodeId, jumpRange, allStars]);

	const action = useSelect(
		(select) => select(actionsStore).getLatestAction(),
		[]
	);

	const routes: Route[] = useMemo(
		() => (showRoutes ? navigationRoutes : []),
		[navigationRoutes, showRoutes]
	);

	const waypointNodes: WaypointNode[] = useMemo(() => {
		if (!showRoutes) {
			return [];
		}

		const knownNodeIds = new Set<number>();
		for (const route of navigationRoutes) {
			knownNodeIds.add(route.from);
			knownNodeIds.add(route.to);
		}

		return navigationRouteNodes
			.filter(
				(node) => node.type === 'waypoint' && knownNodeIds.has(node.id)
			)
			.map((node) => ({
				nodeId: node.id,
				label: `Waypoint #${node.id}`,
				x: node.x,
				y: node.y,
				z: node.z,
			}));
	}, [navigationRouteNodes, navigationRoutes, showRoutes]);

	const routeNodePositions = useMemo(() => {
		const positions = new Map<number, Position3D>();
		for (const star of allStars) {
			positions.set(star.node_id, { x: star.x, y: star.y, z: star.z });
		}
		for (const node of edgeNodes) {
			positions.set(node.id, { x: node.x, y: node.y, z: node.z });
		}
		for (const node of navigationRouteNodes) {
			positions.set(node.id, { x: node.x, y: node.y, z: node.z });
		}
		return positions;
	}, [allStars, edgeNodes, navigationRouteNodes]);

	const selectedDistance = useMemo(() => {
		if (!selectedTarget) {
			return null;
		}

		const currentPosition =
			routeNodePositions?.get(currentNodeId) ??
			allStars.find((s) => s.node_id === currentNodeId) ??
			null;

		if (!currentPosition) {
			return null;
		}

		return distance3D(currentPosition, selectedTarget);
	}, [allStars, currentNodeId, routeNodePositions, selectedTarget]);

	const sizeMultiplier = STAR_SIZE_MULTIPLIER[starSize] ?? 1;
	const viewportStyle = useMemo(
		() => ({ width: '100%', height: '100%' }),
		[]
	);

	const handleDrawerToggle = useCallback(() => {
		setDrawerOpen((v) => !v);
	}, []);

	const hasActiveAction =
		!!action &&
		(action.status === 'pending' || action.status === 'running');

	const handleAstrometricMenuClose = useCallback(() => {
		setTargetSelectEvent(null);
	}, []);

	return (
		<SideDrawer
			open={drawerOpen}
			onToggle={handleDrawerToggle}
			className="helm-bridge"
			viewport={
				<Panel
					variant="inset"
					padding="none"
					className="helm-bridge__viewport"
				>
					<ViewportConfig
						starSize={starSize}
						onStarSizeChange={setStarSize}
						jumpRangeOnly={jumpRangeOnly}
						onJumpRangeOnlyChange={setJumpRangeOnly}
						showRoutes={showRoutes}
						onShowRoutesChange={setShowRoutes}
						showLabels={showLabels}
						onShowLabelsChange={setShowLabels}
					/>
					<Suspense fallback={null}>
						<StarField
							stars={stars}
							waypoints={waypointNodes}
							routes={routes}
							routeOverlays={navigationRouteOverlays}
							nodePositions={routeNodePositions}
							currentNodeId={currentNodeId}
							selectedStarId={selectedStar?.id ?? null}
							selectedTargetNodeId={
								selectedTarget?.kind === 'waypoint'
									? selectedTarget.nodeId
									: null
							}
							onTargetSelect={handleTargetSelect}
							starScale={sizeMultiplier}
							showLabels={showLabels}
							style={viewportStyle}
							selectedTargetOverlay={
								targetSelectEvent ? (
									<AstrometricMenu
										target={targetSelectEvent.target}
										currentNodeId={currentNodeId}
										selectedDistance={
											selectedDistance ??
											targetSelectEvent.distance
										}
										hasActiveAction={hasActiveAction}
										onClose={handleAstrometricMenuClose}
									/>
								) : undefined
							}
						/>
					</Suspense>
				</Panel>
			}
		>
			<ShipSystemsCard />
			<ShipLog shipId={shipId} />
		</SideDrawer>
	);
}
