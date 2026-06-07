import { useMemo } from 'react';
import { useSelect, useSuspenseSelect } from '@wordpress/data';
import {
	isActive,
	isFailed,
	isFulfilled,
	isJump,
	isScanRoute,
	store as actionsStore,
} from '@helm/actions';
import { store as navStore } from '@helm/nav';
import type { NavNode, UserEdge } from '@helm/types';
import type {
	Route,
	RouteEdgeState,
	RouteOverlay,
	RouteState,
} from '../../types';
import { createNavigationEdgeKey } from './utils';

/**
 * Derives canonical navigation routes and transient overlays.
 *
 * This hook suspends while user edges resolve and must be used inside a
 * Suspense boundary.
 */
export function useNavigationEdges(): RouteState {
	const userEdges = useSuspenseSelect(
		(select) => select(navStore).getUserEdges(),
		[]
	);
	const { draft, edgeNodes, latestAction } = useSelect(
		(select) => ({
			draft: select(actionsStore).getDraft(),
			edgeNodes: select(navStore).getEdgeNodes(),
			latestAction: select(actionsStore).getLatestAction(),
		}),
		[]
	);

	return useMemo(() => {
		const routes: Route[] = [];
		const overlays: RouteOverlay[] = [];
		const nodes: NavNode[] = edgeNodes;
		const knownEdges = new Map<
			string,
			{ edgeId: number; routeId: string }
		>();
		const userEdgesById = new Map<number, UserEdge>();

		for (const edge of userEdges ?? []) {
			const routeId = `known-${edge.id}`;
			userEdgesById.set(edge.id, edge);
			routes.push({
				id: routeId,
				from: edge.node_a_id,
				to: edge.node_b_id,
				type: 'route',
				state: 'idle',
			});
			knownEdges.set(
				createNavigationEdgeKey(edge.node_a_id, edge.node_b_id),
				{ edgeId: edge.id, routeId }
			);
			knownEdges.set(
				createNavigationEdgeKey(edge.node_b_id, edge.node_a_id),
				{ edgeId: edge.id, routeId }
			);
		}

		if (draft !== null) {
			if (isScanRoute(draft)) {
				const from = draft.params.source_node_id;
				const to = draft.params.target_node_id;
				const canonical = knownEdges.get(
					createNavigationEdgeKey(from, to)
				);

				overlays.push({
					id: `${draft.type}-draft-${draft.params.source_node_id}-${draft.params.target_node_id}`,
					from,
					to,
					state: 'planned',
					selected: true,
					type: 'scan',
					canonicalEdgeId: canonical?.edgeId,
					canonicalRouteId: canonical?.routeId,
				});
			}

			if (isJump(draft)) {
				draft.params.route.forEach((edgeId, index) => {
					const edge = userEdgesById.get(edgeId);
					if (!edge) {
						return;
					}

					const canonical = knownEdges.get(
						createNavigationEdgeKey(edge.node_a_id, edge.node_b_id)
					);

					overlays.push({
						id: `${draft.type}-draft-${draft.params.from_node_id}-${draft.params.target_node_id}-${index}`,
						from: edge.node_a_id,
						to: edge.node_b_id,
						state: 'planned',
						selected: true,
						type: 'jump',
						canonicalEdgeId: canonical?.edgeId,
						canonicalRouteId: canonical?.routeId,
					});
				});
			}

			return { routes, overlays, nodes };
		}

		if (!latestAction) {
			return { routes, overlays, nodes };
		}

		if (isScanRoute(latestAction)) {
			if (isActive(latestAction) || isFailed(latestAction)) {
				const from =
					latestAction.result?.from_node_id ??
					latestAction.params.source_node_id;
				const to =
					latestAction.result?.to_node_id ??
					latestAction.params.target_node_id;
				const state: RouteEdgeState = isActive(latestAction)
					? 'active'
					: 'failed';
				const canonical = knownEdges.get(
					createNavigationEdgeKey(from, to)
				);

				overlays.push({
					id: `${latestAction.type}-${state}-${latestAction.id}`,
					from,
					to,
					state,
					selected: true,
					type: 'scan',
					canonicalEdgeId: canonical?.edgeId,
					canonicalRouteId: canonical?.routeId,
				});

				return { routes, overlays, nodes };
			}

			if (!isFulfilled(latestAction)) {
				return { routes, overlays, nodes };
			}

			for (const edgeId of latestAction.result.discovered_edge_ids) {
				const edge = userEdgesById.get(edgeId);
				if (!edge) {
					continue;
				}

				const canonical = knownEdges.get(
					createNavigationEdgeKey(edge.node_a_id, edge.node_b_id)
				);

				overlays.push({
					id: `scan-result-${latestAction.id}-${edge.id}`,
					from: edge.node_a_id,
					to: edge.node_b_id,
					state: 'complete',
					selected: true,
					type: 'scan',
					canonicalEdgeId: canonical?.edgeId,
					canonicalRouteId: canonical?.routeId,
				});
			}

			return { routes, overlays, nodes };
		}

		if (isJump(latestAction)) {
			if (isActive(latestAction) || isFailed(latestAction)) {
				const actionIsActive = isActive(latestAction);
				const actionIsFailed = isFailed(latestAction);
				const completedPhaseCount =
					latestAction.result?.phases?.length ?? 0;
				const currentRouteIndex = Math.min(
					completedPhaseCount,
					Math.max(latestAction.params.route.length - 1, 0)
				);

				for (const [
					index,
					edgeId,
				] of latestAction.params.route.entries()) {
					const edge = userEdgesById.get(edgeId);
					if (!edge) {
						continue;
					}

					const canonical = knownEdges.get(
						createNavigationEdgeKey(edge.node_a_id, edge.node_b_id)
					);

					let state: RouteEdgeState;
					let selected = true;
					if (index < completedPhaseCount) {
						state = 'complete';
					} else if (actionIsFailed) {
						state = 'failed';
						selected = index <= currentRouteIndex;
					} else if (actionIsActive && index === currentRouteIndex) {
						state = 'active';
					} else {
						state = 'planned';
					}

					overlays.push({
						id: `${latestAction.type}-${state}-${latestAction.id}-${index}`,
						from: edge.node_a_id,
						to: edge.node_b_id,
						state,
						selected,
						type: 'jump',
						canonicalEdgeId: canonical?.edgeId,
						canonicalRouteId: canonical?.routeId,
					});
				}

				return { routes, overlays, nodes };
			}

			if (!isFulfilled(latestAction)) {
				return { routes, overlays, nodes };
			}

			const completedPhaseCount =
				latestAction.result?.phases?.length ?? 0;
			for (const [index, edgeId] of latestAction.params.route
				.slice(0, completedPhaseCount)
				.entries()) {
				const edge = userEdgesById.get(edgeId);
				if (!edge) {
					continue;
				}

				const canonical = knownEdges.get(
					createNavigationEdgeKey(edge.node_a_id, edge.node_b_id)
				);

				overlays.push({
					id: `jump-result-${latestAction.id}-${index}`,
					from: edge.node_a_id,
					to: edge.node_b_id,
					state: 'complete',
					selected: true,
					type: 'jump',
					canonicalEdgeId: canonical?.edgeId,
					canonicalRouteId: canonical?.routeId,
				});
			}
		}

		return { routes, overlays, nodes };
	}, [draft, edgeNodes, latestAction, userEdges]);
}
