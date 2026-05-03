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
import type { Route, RouteOverlay, RouteState } from '../../types';
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
				status: 'discovered',
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
			if (isScanRoute(draft) || isJump(draft)) {
				const from = draft.params.source_node_id;
				const to = draft.params.target_node_id;
				const canonical = knownEdges.get(
					createNavigationEdgeKey(from, to)
				);

				overlays.push({
					id: `${draft.type}-draft-${draft.params.source_node_id}-${draft.params.target_node_id}`,
					from,
					to,
					status: 'plotted',
					active: true,
					type: isScanRoute(draft) ? 'scan' : 'jump',
					canonicalEdgeId: canonical?.edgeId,
					canonicalRouteId: canonical?.routeId,
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
				const state = isActive(latestAction) ? 'active' : 'failed';
				const canonical = knownEdges.get(
					createNavigationEdgeKey(from, to)
				);

				overlays.push({
					id: `${latestAction.type}-${state}-${latestAction.id}`,
					from,
					to,
					status: isActive(latestAction) ? 'plotted' : 'blocked',
					active: true,
					type: 'scan',
					canonicalEdgeId: canonical?.edgeId,
					canonicalRouteId: canonical?.routeId,
					pulse: isActive(latestAction),
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
					status: 'plotted',
					active: true,
					type: 'scan',
					canonicalEdgeId: canonical?.edgeId,
					canonicalRouteId: canonical?.routeId,
				});
			}

			return { routes, overlays, nodes };
		}

		if (isJump(latestAction)) {
			if (isActive(latestAction) || isFailed(latestAction)) {
				const from =
					latestAction.result?.from_node_id ??
					latestAction.params.source_node_id;
				const to =
					latestAction.result?.to_node_id ??
					latestAction.params.target_node_id;
				const state = isActive(latestAction) ? 'active' : 'failed';
				const canonical = knownEdges.get(
					createNavigationEdgeKey(from, to)
				);

				overlays.push({
					id: `${latestAction.type}-${state}-${latestAction.id}`,
					from,
					to,
					status: isActive(latestAction) ? 'plotted' : 'blocked',
					active: true,
					type: 'jump',
					canonicalEdgeId: canonical?.edgeId,
					canonicalRouteId: canonical?.routeId,
					pulse: isActive(latestAction),
				});

				return { routes, overlays, nodes };
			}

			if (!isFulfilled(latestAction)) {
				return { routes, overlays, nodes };
			}

			const canonical = knownEdges.get(
				createNavigationEdgeKey(
					latestAction.result.from_node_id,
					latestAction.result.to_node_id
				)
			);

			overlays.push({
				id: `jump-result-${latestAction.id}`,
				from: latestAction.result.from_node_id,
				to: latestAction.result.to_node_id,
				status: 'traveled',
				active: true,
				type: 'jump',
				canonicalEdgeId: canonical?.edgeId,
				canonicalRouteId: canonical?.routeId,
			});
		}

		return { routes, overlays, nodes };
	}, [draft, edgeNodes, latestAction, userEdges]);
}
