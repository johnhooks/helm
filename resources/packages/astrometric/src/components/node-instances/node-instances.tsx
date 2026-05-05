import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { InstancedMesh } from 'three';
import { Object3D, Raycaster, Vector2 } from 'three';
import type { StarNode } from '@helm/types';
import type { WaypointNode } from '../../types';
import { STAR_BASE_SIZE } from '../../constants';
import { getStarSystemColor, lcarsColors } from '../../utils/colors';
import { NodeOverlays } from './node-overlays';

const HOVER_LERP_SPEED = 0.15;
const HOVER_SCALE_MULT = 1.5;
const WAYPOINT_BASE_SCALE = 0.5;

export interface NodeInstancesProps {
	stars: StarNode[];
	waypoints?: WaypointNode[];
	selectedStarId?: number | null;
	selectedTargetNodeId?: number | null;
	connectedNodeIds: Set<number>;
	currentNodeId?: number | null;
	visitedNodeIds?: Set<number>;
	reachableNodeIds?: Set<number>;
	starScale?: number;
	showLabels?: boolean;
	onStarSelect?: (
		star: StarNode,
		screenPosition: { x: number; y: number }
	) => void;
	onWaypointSelect?: (
		waypoint: WaypointNode,
		screenPosition: { x: number; y: number }
	) => void;
	onStarHover?: (star: StarNode | null) => void;
}

export function NodeInstances({
	stars,
	waypoints = [],
	selectedStarId,
	selectedTargetNodeId,
	connectedNodeIds,
	reachableNodeIds,
	starScale = 1,
	showLabels = false,
	onStarSelect,
	onWaypointSelect,
	onStarHover,
}: NodeInstancesProps) {
	const meshRef = useRef<InstancedMesh>(null);
	const { camera, gl, invalidate } = useThree();

	// Reusable Object3D for matrix calculations (avoids per-frame allocation)
	const tempObj = useRef(new Object3D());

	// Track hovered instance (ref for animation loop, state for label rendering)
	const hoveredRef = useRef<number | null>(null);
	const [hoveredStar, setHoveredStar] = useState<StarNode | null>(null);
	const [hoveredWaypoint, setHoveredWaypoint] = useState<WaypointNode | null>(
		null
	);

	// Stable refs for callbacks (prevents event listener churn)
	const onStarHoverRef = useRef(onStarHover);
	onStarHoverRef.current = onStarHover;
	const onStarSelectRef = useRef(onStarSelect);
	onStarSelectRef.current = onStarSelect;
	const onWaypointSelectRef = useRef(onWaypointSelect);
	onWaypointSelectRef.current = onWaypointSelect;

	// Hover animation state: at most 2 stars animating at once
	const animRef = useRef<{
		up: { index: number; t: number } | null;
		down: { index: number; t: number } | null;
	}>({ up: null, down: null });

	// Raycaster for mouse interaction
	const raycaster = useMemo(() => new Raycaster(), []);
	const mouse = useMemo(() => new Vector2(), []);

	const instanceCount = stars.length + waypoints.length;

	// Calculate scales for each star based on stellar radius and connectivity
	const getScale = useCallback(
		(star: StarNode) => {
			const isConnected = connectedNodeIds.has(star.node_id);
			const isReachable = reachableNodeIds
				? reachableNodeIds.has(star.node_id)
				: true;

			// Stellar radius -> visual scale via log curve (solar radii, clamped 0.1-20)
			const r = Math.max(0.1, Math.min(star.radius ?? 1, 20));
			const sizeScale =
				0.3 + 0.6 * (Math.log10(r * 10) / Math.log10(200));

			if (isConnected) {
				return sizeScale * starScale;
			}
			if (isReachable) {
				return sizeScale * 0.5 * starScale;
			}
			return sizeScale * 0.2 * starScale;
		},
		[connectedNodeIds, reachableNodeIds, starScale]
	);

	// Initialize and update instance matrices
	useEffect(() => {
		if (!meshRef.current) {
			return;
		}

		const tmp = tempObj.current;

		stars.forEach((star, i) => {
			const scale = getScale(star);

			tmp.position.set(star.x, star.y, star.z);
			tmp.scale.setScalar(scale);
			tmp.updateMatrix();

			meshRef.current!.setMatrixAt(i, tmp.matrix);
			meshRef.current!.setColorAt(
				i,
				getStarSystemColor(star.spectral_class)
			);
		});

		const waypointScale = WAYPOINT_BASE_SCALE * starScale;
		waypoints.forEach((waypoint, index) => {
			const instanceId = stars.length + index;

			tmp.position.set(waypoint.x, waypoint.y, waypoint.z);
			tmp.scale.setScalar(waypointScale);
			tmp.updateMatrix();

			meshRef.current!.setMatrixAt(instanceId, tmp.matrix);
			meshRef.current!.setColorAt(instanceId, lcarsColors.lilac);
		});

		meshRef.current.instanceMatrix.needsUpdate = true;
		if (meshRef.current.instanceColor) {
			meshRef.current.instanceColor.needsUpdate = true;
		}

		// Reset animation state when stars/scales change
		animRef.current = { up: null, down: null };
		setHoveredWaypoint(null);
		invalidate();
	}, [getScale, invalidate, starScale, stars, waypoints]);

	const getIntersectedTarget = useCallback(() => {
		const intersects = meshRef.current
			? raycaster.intersectObject(meshRef.current)
			: [];

		const hit = intersects[0];
		if (!hit || hit.instanceId === undefined) {
			return null;
		}

		if (hit.instanceId < stars.length) {
			return { kind: 'star' as const, instanceId: hit.instanceId };
		}

		return {
			kind: 'waypoint' as const,
			instanceId: hit.instanceId - stars.length,
		};
	}, [raycaster, stars.length]);

	// Handle pointer move for hover detection
	const handlePointerMove = useCallback(
		(event: PointerEvent) => {
			if (!meshRef.current) {
				return;
			}

			const rect = gl.domElement.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

			raycaster.setFromCamera(mouse, camera);
			const intersected = getIntersectedTarget();

			if (intersected?.kind === 'star') {
				const instanceId = intersected.instanceId;
				if (hoveredRef.current !== instanceId) {
					hoveredRef.current = instanceId;
					const star = stars[instanceId] ?? null;
					setHoveredStar(star);
					setHoveredWaypoint(null);
					onStarHoverRef.current?.(star);
					gl.domElement.style.cursor = 'pointer';
				}
			} else if (intersected?.kind === 'waypoint') {
				const instanceId = intersected.instanceId;
				if (hoveredRef.current !== stars.length + instanceId) {
					hoveredRef.current = stars.length + instanceId;
					const waypoint = waypoints[instanceId] ?? null;
					setHoveredStar(null);
					setHoveredWaypoint(waypoint);
					onStarHoverRef.current?.(null);
					gl.domElement.style.cursor = 'pointer';
				}
			} else if (hoveredRef.current !== null) {
				hoveredRef.current = null;
				setHoveredStar(null);
				setHoveredWaypoint(null);
				onStarHoverRef.current?.(null);
				gl.domElement.style.cursor = 'auto';
			}
		},
		[camera, getIntersectedTarget, gl, mouse, raycaster, stars, waypoints]
	);

	// Handle click for selection
	const handleClick = useCallback(
		(event: MouseEvent) => {
			if (!meshRef.current) {
				return;
			}

			const rect = gl.domElement.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

			raycaster.setFromCamera(mouse, camera);
			const intersected = getIntersectedTarget();

			if (intersected?.kind === 'star') {
				const star = stars[intersected.instanceId];
				if (star) {
					const screenPosition = {
						x: event.clientX - rect.left,
						y: event.clientY - rect.top,
					};
					onStarSelectRef.current?.(star, screenPosition);
				}
			} else if (intersected?.kind === 'waypoint') {
				const waypoint = waypoints[intersected.instanceId];
				if (waypoint) {
					const screenPosition = {
						x: event.clientX - rect.left,
						y: event.clientY - rect.top,
					};
					onWaypointSelectRef.current?.(waypoint, screenPosition);
				}
			}
		},
		[camera, getIntersectedTarget, gl, mouse, raycaster, stars, waypoints]
	);

	// Attach event listeners
	useEffect(() => {
		const canvas = gl.domElement;
		canvas.addEventListener('pointermove', handlePointerMove);
		canvas.addEventListener('click', handleClick);

		return () => {
			canvas.removeEventListener('pointermove', handlePointerMove);
			canvas.removeEventListener('click', handleClick);
		};
	}, [gl, handlePointerMove, handleClick]);

	// Animate hover scale with lerp — only touches 0-2 matrices per frame
	useFrame(() => {
		if (!meshRef.current) {
			return;
		}

		const curr = hoveredRef.current;
		const anim = animRef.current;

		// Detect hover change
		if (curr !== (anim.up?.index ?? null)) {
			// Start scaling the old hovered star back down
			if (anim.up) {
				anim.down = { ...anim.up };
			}
			anim.up = curr !== null ? { index: curr, t: 0 } : null;
		}

		let dirty = false;
		const tmp = tempObj.current;

		// Animate scale-up (hovered star)
		if (anim.up && anim.up.t < 1) {
			anim.up.t = Math.min(1, anim.up.t + HOVER_LERP_SPEED);
			const star = stars[anim.up.index];
			if (star) {
				const base = getScale(star);
				tmp.position.set(star.x, star.y, star.z);
				tmp.scale.setScalar(
					base * (1 + (HOVER_SCALE_MULT - 1) * anim.up.t)
				);
				tmp.updateMatrix();
				meshRef.current.setMatrixAt(anim.up.index, tmp.matrix);
				dirty = true;
			}
		}

		// Animate scale-down (previously hovered star)
		if (anim.down) {
			anim.down.t = Math.max(0, anim.down.t - HOVER_LERP_SPEED);
			const star = stars[anim.down.index];
			if (star) {
				const base = getScale(star);
				tmp.position.set(star.x, star.y, star.z);
				tmp.scale.setScalar(
					base * (1 + (HOVER_SCALE_MULT - 1) * anim.down.t)
				);
				tmp.updateMatrix();
				meshRef.current.setMatrixAt(anim.down.index, tmp.matrix);
				dirty = true;
			}
			if (anim.down.t <= 0) {
				anim.down = null;
			}
		}

		if (dirty) {
			meshRef.current.instanceMatrix.needsUpdate = true;
			invalidate();
		}
	});

	const selectedStar =
		selectedStarId !== null && selectedStarId !== undefined
			? stars.find((s) => s.id === selectedStarId)
			: null;
	const selectedWaypoint =
		selectedTargetNodeId !== null && selectedTargetNodeId !== undefined
			? waypoints.find(
					(waypoint) => waypoint.nodeId === selectedTargetNodeId
			  )
			: null;

	return (
		<>
			<instancedMesh
				ref={meshRef}
				args={[undefined, undefined, instanceCount]}
			>
				<sphereGeometry args={[STAR_BASE_SIZE, 16, 16]} />
				<meshBasicMaterial />
			</instancedMesh>

			<NodeOverlays
				stars={stars}
				selectedStar={selectedStar ?? null}
				hoveredStar={hoveredStar}
				selectedWaypoint={selectedWaypoint ?? null}
				hoveredWaypoint={hoveredWaypoint}
				showLabels={showLabels}
				getScale={getScale}
			/>
		</>
	);
}
