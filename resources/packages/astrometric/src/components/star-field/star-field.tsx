import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useMemo, useCallback, useRef } from 'react';
import type { StarNode } from '@helm/types';
import type {
	StarFieldProps,
	Route,
	RouteOverlay,
	StarSelectEvent,
	NavigationTargetSelectEvent,
	RouteSelectEvent,
	HoverState,
	CameraInfo,
	Position3D,
	WaypointNode,
} from '../../types';
import {
	DEFAULT_BACKGROUND_STAR_COUNT,
	DEFAULT_CAMERA_DISTANCE,
	DEFAULT_DISTANCE_RINGS,
	DEFAULT_MAX_DISTANCE,
	DEFAULT_MIN_DISTANCE,
	ASTROMETRIC_MENU_Z_INDEX_RANGE,
} from '../../constants';
import { lcarsColors, distanceFromOrigin } from '../../utils';
import { CameraControls } from '../camera-controls';
import { BackgroundStars } from '../background-stars';
import { GalacticPlane } from '../galactic-plane';
import { MeasuringPivot } from '../measuring-pivot';
import { NodeInstances } from '../node-instances';
import { DistanceRings } from '../distance-rings';
import { RouteLine } from '../route-line';
import './star-field.css';

export function StarField({
	stars,
	waypoints = [],
	routes = [],
	routeOverlays = [],
	distanceRings = DEFAULT_DISTANCE_RINGS,
	backgroundStarCount = DEFAULT_BACKGROUND_STAR_COUNT,
	nodePositions,
	selectedStarId = null,
	selectedTargetNodeId = null,
	selectedRouteId = null,
	currentNodeId,
	visitedNodeIds,
	reachableNodeIds,
	onStarSelect,
	onTargetSelect,
	onRouteSelect,
	onHoverChange,
	onCameraChange,
	showBackground = false,
	showDistanceLabels = true,
	showLabels = false,
	enableControls = true,
	initialCameraDistance = DEFAULT_CAMERA_DISTANCE,
	minDistance = DEFAULT_MIN_DISTANCE,
	maxDistance = DEFAULT_MAX_DISTANCE,
	cameraMode = 'perspective',
	starScale = 1,
	selectedTargetOverlay,
	className = '',
	style,
	'data-testid': testId,
}: StarFieldProps) {
	const hoverRef = useRef<HoverState>({ star: null, route: null });

	// Build star lookup by node_id for routes
	const starsByNodeId = useMemo(() => {
		const map = new Map<number, StarNode>();
		stars.forEach((s) => map.set(s.node_id, s));
		return map;
	}, [stars]);

	const waypointsByNodeId = useMemo(() => {
		const map = new Map<number, WaypointNode>();
		waypoints.forEach((waypoint) => map.set(waypoint.nodeId, waypoint));
		return map;
	}, [waypoints]);

	// Get selected navigation target's position for camera focus
	const focusTarget: Position3D | null = useMemo(() => {
		if (
			selectedTargetNodeId !== null &&
			selectedTargetNodeId !== undefined
		) {
			const waypoint = waypointsByNodeId.get(selectedTargetNodeId);
			if (waypoint) {
				return { x: waypoint.x, y: waypoint.y, z: waypoint.z };
			}
		}

		if (selectedStarId === null || selectedStarId === undefined) {
			return null;
		}
		const star = stars.find((s) => s.id === selectedStarId);
		return star ? { x: star.x, y: star.y, z: star.z } : null;
	}, [selectedStarId, selectedTargetNodeId, stars, waypointsByNodeId]);

	// Camera orbits the current ship node. Falls back to origin only when the
	// current node is not present in any loaded star or graph-node coordinates.
	const cameraTarget: Position3D = useMemo(() => {
		if (currentNodeId === null || currentNodeId === undefined) {
			return { x: 0, y: 0, z: 0 };
		}
		const star = starsByNodeId.get(currentNodeId);
		if (star) {
			return { x: star.x, y: star.y, z: star.z };
		}

		const waypoint = waypointsByNodeId.get(currentNodeId);
		if (waypoint) {
			return { x: waypoint.x, y: waypoint.y, z: waypoint.z };
		}

		const position = nodePositions?.get(currentNodeId);
		return position
			? { x: position.x, y: position.y, z: position.z }
			: { x: 0, y: 0, z: 0 };
	}, [currentNodeId, nodePositions, starsByNodeId, waypointsByNodeId]);

	const measuringTarget: Position3D | null = useMemo(() => {
		if (!focusTarget) {
			return null;
		}

		return {
			x: focusTarget.x - cameraTarget.x,
			y: focusTarget.y - cameraTarget.y,
			z: focusTarget.z - cameraTarget.z,
		};
	}, [cameraTarget, focusTarget]);

	// Track which node IDs have routes connected
	const connectedNodeIds = useMemo(() => {
		const ids = new Set<number>();
		routes.forEach((route) => {
			ids.add(route.from);
			ids.add(route.to);
		});
		routeOverlays.forEach((overlay) => {
			ids.add(overlay.from);
			ids.add(overlay.to);
		});
		return ids;
	}, [routeOverlays, routes]);

	const renderedRoutes = useMemo(() => {
		if (routeOverlays.length === 0) {
			return routes;
		}

		const displacedRouteIds = new Set(
			routeOverlays
				.map((overlay) => overlay.canonicalRouteId)
				.filter((id): id is string => id !== undefined)
		);

		return [
			...routes.filter((route) => !displacedRouteIds.has(route.id)),
			...routeOverlays,
		];
	}, [routeOverlays, routes]);

	// Handle star selection
	const handleStarClick = useCallback(
		(star: StarNode, screenPosition: { x: number; y: number }) => {
			if (!onStarSelect && !onTargetSelect) {
				return;
			}

			if (selectedStarId === star.id) {
				onStarSelect?.(null);
				onTargetSelect?.(null);
			} else {
				const event: StarSelectEvent = {
					star,
					distance: distanceFromOrigin({
						x: star.x,
						y: star.y,
						z: star.z,
					}),
					screenPosition,
				};
				onStarSelect?.(event);
				onTargetSelect?.({
					target: {
						kind: 'star',
						nodeId: star.node_id,
						label: star.title,
						x: star.x,
						y: star.y,
						z: star.z,
						star,
					},
					distance: event.distance,
					screenPosition,
				});
			}
		},
		[onStarSelect, onTargetSelect, selectedStarId]
	);

	const handleWaypointClick = useCallback(
		(
			waypoint: (typeof waypoints)[number],
			screenPosition: { x: number; y: number }
		) => {
			if (!onTargetSelect) {
				return;
			}

			if (selectedTargetNodeId === waypoint.nodeId) {
				onTargetSelect(null);
			} else {
				const event: NavigationTargetSelectEvent = {
					target: {
						kind: 'waypoint',
						nodeId: waypoint.nodeId,
						label: waypoint.label,
						x: waypoint.x,
						y: waypoint.y,
						z: waypoint.z,
					},
					distance: distanceFromOrigin(waypoint),
					screenPosition,
				};
				onTargetSelect(event);
			}
		},
		[onTargetSelect, selectedTargetNodeId]
	);

	// Handle route selection
	const handleRouteClick = useCallback(
		(route: Route | RouteOverlay) => {
			if (!onRouteSelect) {
				return;
			}

			if (selectedRouteId === route.id) {
				onRouteSelect(null);
			} else {
				const from = starsByNodeId.get(route.from);
				const to = starsByNodeId.get(route.to);
				if (!from || !to) {
					return;
				}

				const event: RouteSelectEvent = {
					route,
					from,
					to,
					distance:
						distanceFromOrigin({
							x: from.x,
							y: from.y,
							z: from.z,
						}) + distanceFromOrigin({ x: to.x, y: to.y, z: to.z }),
				};
				onRouteSelect(event);
			}
		},
		[onRouteSelect, selectedRouteId, starsByNodeId]
	);

	// Handle hover changes (ref-based to avoid re-renders)
	const handleStarHover = useCallback(
		(star: StarNode | null) => {
			hoverRef.current = { ...hoverRef.current, star };
			onHoverChange?.(hoverRef.current);
		},
		[onHoverChange]
	);

	const handleRouteHover = useCallback(
		(route: Route | RouteOverlay | null) => {
			hoverRef.current = { ...hoverRef.current, route };
			onHoverChange?.(hoverRef.current);
		},
		[onHoverChange]
	);

	// Handle camera changes
	const handleCameraChange = useCallback(
		(info: CameraInfo) => {
			onCameraChange?.(info);
		},
		[onCameraChange]
	);

	const classNames = ['helm-star-field', className].filter(Boolean).join(' ');

	// Camera configuration based on mode
	const isOrthographic = cameraMode === 'orthographic';
	const cameraFov = cameraMode === 'narrow' ? 30 : 50;
	// For orthographic, zoom is roughly pixels-per-unit - 25 gives a reasonable starting view
	const orthoZoom = 25;

	return (
		<div className={classNames} style={style} data-testid={testId}>
			{/* Key forces Canvas remount when camera type changes */}
			<Canvas
				key={cameraMode}
				orthographic={isOrthographic}
				camera={
					isOrthographic
						? { zoom: orthoZoom, near: 0.1, far: 500 }
						: { fov: cameraFov, near: 0.1, far: 500 }
				}
				frameloop="demand"
				gl={{ antialias: true }}
			>
				{/* Background color */}
				<color attach="background" args={[lcarsColors.bg]} />

				{/* Camera controls */}
				<CameraControls
					enabled={enableControls}
					initialDistance={initialCameraDistance}
					minDistance={minDistance}
					maxDistance={maxDistance}
					onCameraChange={handleCameraChange}
					isOrthographic={isOrthographic}
					target={cameraTarget}
				/>

				{/* Galactic plane glow (distant galaxy disk) - hidden when examining a star */}
				{showBackground && !focusTarget && <GalacticPlane />}

				{/* Background stars (galaxy context) - hidden when examining a star */}
				{showBackground && !focusTarget && (
					<BackgroundStars count={backgroundStarCount} />
				)}

				{/* Measuring rings - tilt to align with selected navigation target */}
				<MeasuringPivot
					position={cameraTarget}
					alignTarget={measuringTarget}
				>
					<DistanceRings
						rings={distanceRings}
						showLabels={showDistanceLabels}
					/>
				</MeasuringPivot>

				{/* Routes between systems */}
				{renderedRoutes.map((route) => {
					const from =
						starsByNodeId.get(route.from) ??
						nodePositions?.get(route.from);
					const to =
						starsByNodeId.get(route.to) ??
						nodePositions?.get(route.to);
					if (!from || !to) {
						return null;
					}

					return (
						<RouteLine
							key={route.id}
							route={route}
							from={from}
							to={to}
							selected={selectedRouteId === route.id}
							onSelect={() => handleRouteClick(route)}
							onHover={(hovering) =>
								handleRouteHover(hovering ? route : null)
							}
						/>
					);
				})}

				{/* Local star systems (instanced for performance) */}
				<NodeInstances
					stars={stars}
					waypoints={waypoints}
					selectedStarId={selectedStarId}
					selectedTargetNodeId={selectedTargetNodeId}
					connectedNodeIds={connectedNodeIds}
					currentNodeId={currentNodeId}
					visitedNodeIds={visitedNodeIds}
					reachableNodeIds={reachableNodeIds}
					starScale={starScale}
					showLabels={showLabels}
					onStarSelect={handleStarClick}
					onWaypointSelect={handleWaypointClick}
					onStarHover={handleStarHover}
				/>

				{/* Overlay content anchored to selected navigation target (e.g. context menu) */}
				{focusTarget && selectedTargetOverlay && (
					<Html
						position={[focusTarget.x, focusTarget.y, focusTarget.z]}
						center={false}
						zIndexRange={ASTROMETRIC_MENU_Z_INDEX_RANGE}
						style={{ pointerEvents: 'auto' }}
					>
						<div style={{ marginLeft: '28px', marginTop: '16px' }}>
							{selectedTargetOverlay}
						</div>
					</Html>
				)}
			</Canvas>
		</div>
	);
}
