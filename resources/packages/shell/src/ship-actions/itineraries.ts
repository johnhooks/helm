import { __, sprintf } from '@wordpress/i18n';
import { SPECTRAL_CLASSES } from '@helm/ui';
import type { DraftAction, ShipAction } from '@helm/actions';
import type { KnownPathResult } from '@helm/datacore';
import type { NavNode, StarNode, UserEdge } from '@helm/types';
import type { RouteItineraryNode, RouteItineraryProps } from '@helm/ui';
import { getJumpTargetName } from './jump/utils';

export type NodeDetails = Record<
	number,
	Pick<RouteItineraryNode, 'label' | 'spectralClass'> & {
		kind: 'star' | 'waypoint' | 'unknown';
	}
>;

export function nodeDetails(
	node: StarNode | NavNode | undefined,
	id: number
): NodeDetails[number] {
	if (!node) {
		return {
			label: sprintf(
				/* translators: %d: Navigation node ID. */
				__('Node #%d', 'helm'),
				id
			),
			kind: 'unknown',
		};
	}
	let kind: NodeDetails[number]['kind'] = 'unknown';
	if ('title' in node) {
		kind = 'star';
	} else if (node.type === 'waypoint') {
		kind = 'waypoint';
	}
	return {
		label: getJumpTargetName(node),
		kind,
		...('spectral_class' in node
			? {
					spectralClass: SPECTRAL_CLASSES.find(
						(value) => value === node.spectral_class
					),
			  }
			: {}),
	};
}

function detail(id: number, details: NodeDetails): NodeDetails[number] {
	return (
		details[id] ?? {
			label: sprintf(
				/* translators: %d: Navigation node ID. */
				__('Node #%d', 'helm'),
				id
			),
			kind: 'unknown',
		}
	);
}

export function scanItinerary(
	value: DraftAction<'scan_route'> | ShipAction<'scan_route'>,
	targetName: string,
	details: NodeDetails
): RouteItineraryProps {
	const origin = value.params.from_node_id ?? value.params.source_node_id;
	const action = 'status' in value ? value : null;
	const storedPath = action?.result?.path ?? [];
	const path =
		storedPath[0] === origin ? storedPath : [origin, ...storedPath];
	const reached = path[path.length - 1] === value.params.target_node_id;
	const active = action?.status === 'pending' || action?.status === 'running';
	const failed = action?.status === 'failed';
	const nodes: RouteItineraryNode[] = path.map((id, index) => {
		return {
			id,
			...detail(id, details),
			state: action ? 'complete' : 'pending',
			outgoingLeg:
				index < path.length - 1 ? { state: 'complete' } : undefined,
		};
	});

	if ((active && !reached) || failed) {
		const last = nodes[nodes.length - 1];
		last.outgoingLeg = { state: failed ? 'failed' : 'active' };
		nodes.push({
			id: `scan-${action?.id ?? 'draft'}`,
			label: failed
				? __('Scan interrupted', 'helm')
				: sprintf(
						/* translators: %s: Last discovered node name. */
						__('Searching beyond %s', 'helm'),
						last.label
				  ),
			kind: 'search',
			state: failed ? 'failed' : 'active',
			current: active,
		});
	} else if (action && !reached) {
		nodes[nodes.length - 1].current = true;
	}

	return {
		label: __('Scan discoveries', 'helm'),
		nodes,
		target: reached
			? undefined
			: {
					...detail(value.params.target_node_id, details),
					id: value.params.target_node_id,
					label: sprintf(
						/* translators: %s: Target star name. */
						__('Target: %s', 'helm'),
						targetName
					),
					description: __('Path not yet connected', 'helm'),
					kind: 'star',
			  },
		tone: 'lilac',
		activityTone: 'orange',
	};
}

export function jumpItinerary(
	value: DraftAction<'jump'> | ShipAction<'jump'>,
	targetName: string,
	routePath: KnownPathResult | undefined,
	userEdges: UserEdge[] | undefined,
	details: NodeDetails
): RouteItineraryProps {
	const action = 'status' in value ? value : null;
	const route = value.params.route;
	const acceptedPath = jumpPath(value, routePath, userEdges);
	const ids = acceptedPath ?? [
		action?.result?.current_node_id ?? value.params.from_node_id,
	];
	const completed = Math.min(
		action?.result?.phases?.length ?? 0,
		route.length
	);
	const final = action?.status === 'fulfilled';
	const failed = action?.status === 'failed';
	const active = action?.status === 'pending' || action?.status === 'running';
	let currentIndex = acceptedPath ? Math.min(completed, ids.length - 1) : 0;
	if (final) {
		currentIndex = ids.length - 1;
	}
	const nodes: RouteItineraryNode[] = ids.map((id, index) => {
		const isComplete = final || (!!action && index <= completed);
		let legState: 'pending' | 'active' | 'complete' | 'failed' = 'pending';
		if (final || (!!action && index < completed)) {
			legState = 'complete';
		} else if (failed && index === completed) {
			legState = 'failed';
		} else if (active && index === completed) {
			legState = 'active';
		}
		const description =
			index === 0 && !acceptedPath
				? __('Confirmed position', 'helm')
				: undefined;
		let endpoint: RouteItineraryNode['endpoint'];
		if (acceptedPath && index === 0) {
			endpoint = 'departure';
		} else if (acceptedPath && index === ids.length - 1) {
			endpoint = 'destination';
		}
		return {
			id,
			...detail(id, details),
			state: isComplete ? 'complete' : 'pending',
			current: index === currentIndex,
			description,
			endpoint,
			outgoingLeg:
				index < ids.length - 1 ? { state: legState } : undefined,
		};
	});
	return {
		label: __('Jump itinerary', 'helm'),
		nodes,
		target: acceptedPath
			? undefined
			: {
					...detail(value.params.target_node_id, details),
					id: value.params.target_node_id,
					label: sprintf(
						/* translators: %s: Target star name. */
						__('Target: %s', 'helm'),
						targetName
					),
					description: __('Route details unavailable', 'helm'),
					kind: 'star',
			  },
		tone: 'sky',
		activityTone: 'gold',
	};
}

export function jumpPath(
	value: DraftAction<'jump'> | ShipAction<'jump'>,
	routePath: KnownPathResult | undefined,
	userEdges: UserEdge[] | undefined
): number[] | undefined {
	const route = value.params.route;
	const matches =
		routePath?.edgeIds.length === route.length &&
		routePath.nodeIds.length === route.length + 1 &&
		route.every((edgeId, index) => routePath.edgeIds[index] === edgeId);
	return matches && routePath
		? routePath.nodeIds
		: pathFromEdges(
				value.params.from_node_id,
				value.params.target_node_id,
				route,
				userEdges
		  );
}

function pathFromEdges(
	from: number,
	target: number,
	route: number[],
	edges: UserEdge[] | undefined
): number[] | undefined {
	if (!edges || route.length === 0) {
		return undefined;
	}
	const byId = new Map(edges.map((edge) => [edge.id, edge]));
	const ids = [from];
	for (const edgeId of route) {
		const edge = byId.get(edgeId);
		const current = ids[ids.length - 1];
		if (
			!edge ||
			(edge.node_a_id !== current && edge.node_b_id !== current)
		) {
			return undefined;
		}
		ids.push(edge.node_a_id === current ? edge.node_b_id : edge.node_a_id);
	}
	return ids[ids.length - 1] === target ? ids : undefined;
}
