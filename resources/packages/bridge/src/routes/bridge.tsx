/**
 * Bridge — astrometric viewport showing the real star map.
 *
 * Star data comes from the nav store, which handles datacore init,
 * sync, and queries behind its resolver. The bridge suspends until
 * the star map is ready, then renders.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { useDispatch, useSelect, useSuspenseSelect } from '@wordpress/data';
import { store as navStore } from '@helm/nav';
import { log } from '@helm/logger';
import { Panel, SideDrawer } from '@helm/ui';
import { useShip } from '@helm/ships';
import { store as actionsStore } from '@helm/actions';
import type { StarSelectEvent, Position3D, Route } from '@helm/astrometric';
import { ViewportConfig } from '../components/viewport-config';
import { StarContextMenu } from '../components/star-context-menu';
import { ShipSystemsCard } from '../components/ship-systems-card';
import { ShipLog } from '@helm/shell';

const StarField = lazy(() =>
	import('@helm/astrometric').then((m) => ({ default: m.StarField }))
);
import './bridge.css';

const STAR_SIZE_MULTIPLIER: Record<string, number> = {
	sm: 0.5,
	md: 1,
	lg: 1.5,
};

function distance3D(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
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
		[],
	);

	const [stars, setStars] = useState(allStars);
	const [starSize, setStarSize] = useState('md');
	const [jumpRangeOnly, setJumpRangeOnly] = useState(false);
	const [showLabels, setShowLabels] = useState(false);
	const [starSelectEvent, setStarSelectEvent] = useState<StarSelectEvent | null>(null);
	const [drawerOpen, setDrawerOpen] = useState(true);

	const selectedStar = starSelectEvent?.star ?? null;

	const handleStarSelect = useCallback((event: StarSelectEvent | null) => {
		setStarSelectEvent(event);
	}, []);

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
	}, [jumpRangeOnly]);

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

	const currentStar = useMemo(
		() => allStars.find((s) => s.node_id === currentNodeId) ?? null,
		[allStars, currentNodeId],
	);

	// Compute distance from current star to selected star.
	const selectedDistance = useMemo(() => {
		if (!currentStar || !selectedStar) {
			return null;
		}
		return distance3D(currentStar, selectedStar);
	}, [currentStar, selectedStar]);

	// Derive routes and waypoint positions from the current action's scan result.
	const action = useSelect(
		(select) => select(actionsStore).getLatestAction(),
		[],
	);

	const { scanRoutes, scanNodePositions } = useMemo(() => {
		const result = action?.result as Record<string, unknown> | null;
		if (!result || !result.edges || !result.nodes) {
			return { scanRoutes: [] as Route[], scanNodePositions: undefined };
		}

		const nodes = result.nodes as Array<{ id: number; x: number; y: number; z: number }>;
		const edges = result.edges as Array<{ id: number; node_a_id: number; node_b_id: number }>;

		const positions = new Map<number, Position3D>();
		for (const node of nodes) {
			positions.set(node.id, { x: node.x, y: node.y, z: node.z });
		}

		const routes: Route[] = edges.map((edge) => ({
			id: `scan-${edge.id}`,
			from: edge.node_a_id,
			to: edge.node_b_id,
			status: 'discovered' as const,
		}));

		return { scanRoutes: routes, scanNodePositions: positions };
	}, [action?.result]);

	const sizeMultiplier = STAR_SIZE_MULTIPLIER[starSize] ?? 1;
	const viewportStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);

	const handleDrawerToggle = useCallback(() => {
		setDrawerOpen((v) => !v);
	}, []);

	const { draftCreate } = useDispatch(actionsStore);

	const hasActiveAction = !! action && ( action.status === 'pending' || action.status === 'running' );

	const handleContextMenuScanRoute = useCallback(() => {
		if ( ! selectedStar ) {
			return;
		}
		draftCreate( {
			type: 'scan_route',
			params: {
				target_node_id: selectedStar.node_id,
				source_node_id: currentNodeId,
				distance_ly: selectedDistance,
			},
		} );
	}, [ selectedStar, currentNodeId, selectedDistance, draftCreate ]);

	const handleContextMenuClose = useCallback(() => {
		setStarSelectEvent(null);
	}, []);

	return (
		<SideDrawer
			open={drawerOpen}
			onToggle={handleDrawerToggle}
			className="helm-bridge"
			viewport={
				<Panel variant="inset" padding="none" className="helm-bridge__viewport">
					<ViewportConfig
						starSize={starSize}
						onStarSizeChange={setStarSize}
						jumpRangeOnly={jumpRangeOnly}
						onJumpRangeOnlyChange={setJumpRangeOnly}
						showLabels={showLabels}
						onShowLabelsChange={setShowLabels}
					/>
					<Suspense fallback={null}>
						<StarField
							stars={stars}
							routes={scanRoutes}
							nodePositions={scanNodePositions}
							currentNodeId={currentNodeId}
							selectedStarId={selectedStar?.id ?? null}
							onStarSelect={handleStarSelect}
							starScale={sizeMultiplier}
							showLabels={showLabels}
							style={viewportStyle}
							selectedStarOverlay={
								starSelectEvent ? (
									<StarContextMenu
										star={ starSelectEvent.star }
										distance={ selectedDistance ?? starSelectEvent.distance }
										hasActiveAction={ hasActiveAction }
										onScanRoute={ handleContextMenuScanRoute }
										onClose={ handleContextMenuClose }
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
