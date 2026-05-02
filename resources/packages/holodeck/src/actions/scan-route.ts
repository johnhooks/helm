import {
	emissionPower,
	tunedEmission,
	DEFAULT_EMISSION_PROFILES,
	firstHopChance,
} from '@helm/formulas';
import type { Ship } from '../ship';
import type { GraphNode, GraphEdge } from '../data/graph';
import type {
	Action,
	ActionContext,
	ActionHandler,
	ActionIntent,
	ActionOutcome,
} from './types';
import { ActionError, ActionErrorCode } from './types';
import { ActionStatus } from '../enums/action-status';
import {
	canDirectJump,
	corridorDifficulty,
	computeWaypoint,
} from '../nav-generator';

const MAX_HOPS = 50;

export const scanRouteHandler: ActionHandler = {
	validate(
		ship: Ship,
		params: Record<string, unknown>,
		context: ActionContext
	): void {
		const state = ship.resolve();

		if (state.nodeId === null) {
			throw new ActionError(
				ActionErrorCode.ShipNoPosition,
				'Ship has no position'
			);
		}

		if (params.target_node_id === undefined) {
			throw new ActionError(
				ActionErrorCode.NavigationMissingTarget,
				'Missing target_node_id'
			);
		}

		if (params.target_node_id === state.nodeId) {
			throw new ActionError(
				ActionErrorCode.NavigationAlreadyAtTarget,
				'Already at target node'
			);
		}

		const graph = context.getGraph?.();
		if (graph) {
			const fromNode = graph.getNode(state.nodeId);
			const toNode = graph.getNode(params.target_node_id as number);
			if (!fromNode) {
				throw new ActionError(
					ActionErrorCode.NavigationNoGraph,
					`From node ${state.nodeId} not found in graph`
				);
			}
			if (!toNode) {
				throw new ActionError(
					ActionErrorCode.NavigationNoGraph,
					`Target node ${params.target_node_id} not found in graph`
				);
			}
		}
	},

	handle(
		ship: Ship,
		params: Record<string, unknown>,
		now: number,
		context: ActionContext
	): ActionIntent {
		const state = ship.resolve();
		const effort = (params.effort as number) ?? 1.0;

		const graph = context.getGraph?.();
		let distance: number;

		if (graph) {
			distance = graph.distanceBetween(
				state.nodeId!,
				params.target_node_id as number
			);
		} else {
			distance = (params.distance as number) ?? 1;
		}

		const successChance = ship.sensors.getScanSuccessChance(
			distance,
			effort
		);
		const powerCost = ship.sensors.getScanPowerCost(distance);
		const duration = ship.sensors.getScanDuration(distance, effort);

		return {
			deferredUntil: now + duration,
			result: {
				from_node_id: state.nodeId,
				to_node_id: params.target_node_id as number,
				distance,
				effort,
				success_chance: successChance,
				power_cost: powerCost,
				duration,
			},
			emissions: [
				{
					emissionType: 'pnp_scan',
					spectralType:
						DEFAULT_EMISSION_PROFILES.pnp_scan.spectralType,
					basePower: tunedEmission(emissionPower('pnp_scan'), effort),
				},
			],
		};
	},

	resolve(ship: Ship, action: Action, context: ActionContext): ActionOutcome {
		const powerCost = action.result.power_cost as number;
		const successChance = action.result.success_chance as number;

		ship.consumePower(powerCost);

		const graph = context.getGraph?.();

		if (!graph) {
			// Legacy path: no graph, simple success/fail roll
			const roll = ship.rng.next();
			return {
				status: ActionStatus.Fulfilled,
				result: {
					success: roll <= successChance,
					roll,
				},
			};
		}

		// Graph-aware path: full discovery algorithm
		const fromId = action.result.from_node_id as number;
		const toId = action.result.to_node_id as number;
		const fromNode = graph.getNode(fromId)!;
		const toNode = graph.getNode(toId)!;
		const masterSeed = graph.masterSeed;

		// Check if direct jump is possible (deterministic)
		if (canDirectJump(masterSeed, fromNode, toNode)) {
			const distance = graph.distanceBetween(fromId, toId);
			const edge = graph.addEdge(fromId, toId, distance);
			return {
				status: ActionStatus.Fulfilled,
				result: {
					success: true,
					complete: true,
					discovered_nodes: [],
					discovered_edges: [serializeEdge(edge)],
				},
			};
		}

		// Roll for first hop success
		// When success is guaranteed (chance >= 1.0), bypass the formula
		// (matches PHP NavComputer::rollFirstHop)
		if (successChance < 1.0) {
			const difficulty = corridorDifficulty(masterSeed, fromId, toId);
			const effectiveChance = firstHopChance(
				successChance,
				action.result.distance as number,
				difficulty
			);
			const roll = ship.rng.next();

			if (roll > effectiveChance) {
				return {
					status: ActionStatus.Fulfilled,
					result: {
						success: false,
						roll,
						effective_chance: effectiveChance,
					},
				};
			}
		}

		// Discover waypoints
		const discoveredNodes: GraphNode[] = [];
		const discoveredEdges: GraphEdge[] = [];
		let currentNode = fromNode;
		let hopIndex = 0;

		while (currentNode.id !== toNode.id && hopIndex < MAX_HOPS) {
			// Check for direct jump from current position
			if (canDirectJump(masterSeed, currentNode, toNode)) {
				const dist = graph.distanceBetween(currentNode.id, toNode.id);
				const edge = graph.addEdge(currentNode.id, toNode.id, dist);
				discoveredEdges.push(edge);
				return {
					status: ActionStatus.Fulfilled,
					result: {
						success: true,
						complete: true,
						discovered_nodes: discoveredNodes.map(serializeNode),
						discovered_edges: discoveredEdges.map(serializeEdge),
					},
				};
			}

			// Generate next waypoint (deterministic)
			const waypointData = computeWaypoint(
				masterSeed,
				currentNode,
				toNode
			);

			// Find or create the waypoint node
			let waypointNode = graph.findNodeByHash(waypointData.hash);
			if (!waypointNode) {
				waypointNode = graph.addNode({
					type: 'waypoint',
					x: waypointData.x,
					y: waypointData.y,
					z: waypointData.z,
					hash: waypointData.hash,
				});
				discoveredNodes.push(waypointNode);
			}

			// Create edge to waypoint
			const edgeDist = graph.distanceBetween(
				currentNode.id,
				waypointNode.id
			);
			const edge = graph.addEdge(
				currentNode.id,
				waypointNode.id,
				edgeDist
			);
			discoveredEdges.push(edge);
			currentNode = waypointNode;
			hopIndex++;

			// Roll for discovering next hop
			const bonusProb = ship.navigation.getDiscoveryProbability(hopIndex);
			const bonusRoll = ship.rng.next();
			if (bonusRoll >= bonusProb) {
				return {
					status: ActionStatus.Fulfilled,
					result: {
						success: true,
						complete: false,
						discovered_nodes: discoveredNodes.map(serializeNode),
						discovered_edges: discoveredEdges.map(serializeEdge),
					},
				};
			}
		}

		return {
			status: ActionStatus.Fulfilled,
			result: {
				success: true,
				complete: currentNode.id === toNode.id,
				discovered_nodes: discoveredNodes.map(serializeNode),
				discovered_edges: discoveredEdges.map(serializeEdge),
			},
		};
	},
};

function serializeNode(node: GraphNode): Record<string, unknown> {
	return {
		id: node.id,
		type: node.type,
		x: node.x,
		y: node.y,
		z: node.z,
		hash: node.hash,
	};
}

function serializeEdge(edge: GraphEdge): Record<string, unknown> {
	return { from: edge.from, to: edge.to, distance: edge.distance };
}
