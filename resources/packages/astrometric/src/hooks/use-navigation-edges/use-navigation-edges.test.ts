import { renderHook } from '@testing-library/react';
import type { DraftAction, ShipAction } from '@helm/actions';
import type { NavNode, UserEdge } from '@helm/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavigationEdges } from './use-navigation-edges';

const selectedState: {
	userEdges: UserEdge[];
	edgeNodes: NavNode[];
	actions: ShipAction[];
	draft: DraftAction | null;
	latestAction: ShipAction | null;
} = {
	userEdges: [],
	edgeNodes: [],
	actions: [],
	draft: null,
	latestAction: null,
};

vi.mock('@wordpress/data', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@wordpress/data')>();

	return {
		...actual,
		useSelect: vi.fn((mapSelect) =>
			mapSelect(() => ({
				getDraft: () => selectedState.draft,
				getLatestAction: () => selectedState.latestAction,
				getEdgeNodes: () => selectedState.edgeNodes,
			}))
		),
		useSuspenseSelect: vi.fn((mapSelect) =>
			mapSelect(() => ({
				getUserEdges: () => selectedState.userEdges,
			}))
		),
	};
});

vi.mock('@helm/actions', () => ({
	store: {},
	isActive: (action: ShipAction) =>
		action.status === 'pending' || action.status === 'running',
	isFailed: (action: ShipAction) => action.status === 'failed',
	isFulfilled: (action: ShipAction) =>
		action.status === 'fulfilled' || action.status === 'partial',
	isJump: (value: ShipAction | DraftAction) => value.type === 'jump',
	isScanRoute: (value: ShipAction | DraftAction) =>
		value.type === 'scan_route',
}));

function createUserEdge(overrides: Partial<UserEdge> = {}): UserEdge {
	return {
		id: 7,
		node_a_id: 1,
		node_b_id: 2,
		distance: 1.5,
		discovered_at: '2026-04-20T00:00:00+00:00',
		...overrides,
	};
}

function createAction(overrides: Partial<ShipAction> = {}): ShipAction {
	return {
		id: 1,
		ship_post_id: 1,
		type: 'scan_route',
		status: 'running',
		params: {
			source_node_id: 1,
			target_node_id: 2,
			distance_ly: 1.5,
		},
		result: null,
		deferred_until: null,
		created_at: '2026-04-20T00:00:00+00:00',
		updated_at: '2026-04-20T00:00:00+00:00',
		...overrides,
	};
}

function renderNavigationEdges({
	userEdges = [],
	edgeNodes = [],
	actions = [],
	draft = null,
}: {
	userEdges?: UserEdge[];
	edgeNodes?: NavNode[];
	actions?: ShipAction[];
	draft?: DraftAction | null;
}) {
	selectedState.userEdges = userEdges;
	selectedState.edgeNodes = edgeNodes;
	selectedState.actions = actions;
	selectedState.draft = draft;
	selectedState.latestAction =
		[...actions].sort((a, b) => b.id - a.id)[0] ?? null;

	return renderHook(() => useNavigationEdges()).result.current;
}

describe('useNavigationEdges', () => {
	beforeEach(() => {
		selectedState.userEdges = [];
		selectedState.edgeNodes = [];
		selectedState.actions = [];
		selectedState.draft = null;
		selectedState.latestAction = null;
	});

	it('returns known graph edges', () => {
		expect(
			renderNavigationEdges({
				userEdges: [createUserEdge({ id: 9 })],
			}).routes
		).toEqual([
			{
				id: 'known-9',
				from: 1,
				to: 2,
				status: 'discovered',
			},
		]);
	});

	it('adds draft scan and jump states while drafts exist', () => {
		expect(
			renderNavigationEdges({
				draft: {
					type: 'scan_route',
					params: {
						source_node_id: 1,
						target_node_id: 4,
						distance_ly: 3,
					},
				},
			}).overlays.at(-1)
		).toMatchObject({
			id: 'scan_route-draft-1-4',
			type: 'scan',
		});

		expect(
			renderNavigationEdges({
				draft: {
					type: 'jump',
					params: {
						source_node_id: 1,
						target_node_id: 5,
						distance_ly: 4,
					},
				},
			}).overlays.at(-1)
		).toMatchObject({
			id: 'jump-draft-1-5',
			type: 'jump',
		});
	});

	it('identifies active scan and jump states independently of UI preferences', () => {
		const { overlays } = renderNavigationEdges({
			actions: [
				createAction({
					id: 3,
					type: 'jump',
					status: 'pending',
					params: {
						source_node_id: 8,
						target_node_id: 9,
						distance_ly: 2,
					},
				}),
			],
		});

		expect(overlays).toContainEqual({
			id: 'jump-active-3',
			from: 8,
			to: 9,
			status: 'plotted',
			active: true,
			type: 'jump',
			pulse: true,
		});
	});

	it('dismisses scan results when a newer draft or action appears', () => {
		const fulfilled = createAction({
			id: 2,
			status: 'fulfilled',
			result: {
				from_node_id: 1,
				to_node_id: 2,
				skill: 1,
				efficiency: 1,
				duration: 60,
				success: true,
				complete: true,
				nodes: [],
				edges: [{ id: 99, node_a_id: 1, node_b_id: 2 }],
				discovered_edge_ids: [99],
				discovered_node_ids: [],
				edges_discovered: 1,
				waypoints_created: 0,
				path: [1, 2],
			},
		});

		expect(
			renderNavigationEdges({
				userEdges: [createUserEdge({ id: 99 })],
				actions: [fulfilled],
			}).overlays.at(-1)
		).toMatchObject({
			type: 'scan',
		});

		expect(
			renderNavigationEdges({
				actions: [fulfilled],
				draft: {
					type: 'scan_route',
					params: {
						source_node_id: 1,
						target_node_id: 3,
						distance_ly: 2,
					},
				},
			}).overlays.some(
				(edge) =>
					edge.type === 'scan' &&
					edge.status === 'plotted' &&
					edge.id.startsWith('scan-result-')
			)
		).toBe(false);

		expect(
			renderNavigationEdges({
				actions: [
					fulfilled,
					createAction({
						id: 4,
						type: 'survey',
						status: 'running',
						params: {},
					}),
				],
			}).overlays.some(
				(edge) =>
					edge.type === 'scan' &&
					edge.status === 'plotted' &&
					edge.id.startsWith('scan-result-')
			)
		).toBe(false);
	});

	it('retains the latest fulfilled jump until a newer navigation state appears', () => {
		const { overlays } = renderNavigationEdges({
			userEdges: [createUserEdge({ id: 44, node_a_id: 1, node_b_id: 2 })],
			actions: [
				createAction({
					id: 4,
					type: 'jump',
					status: 'fulfilled',
					result: {
						from_node_id: 1,
						to_node_id: 2,
						distance: 1.5,
						core_cost: 2,
						duration: 60,
						remaining_core_life: 98,
						core_before: 100,
					},
				}),
			],
		});

		expect(overlays.at(-1)).toMatchObject({
			id: 'jump-result-4',
			type: 'jump',
			canonicalEdgeId: 44,
		});
	});

	it('returns nav store edge nodes for route positioning', () => {
		expect(
			renderNavigationEdges({
				edgeNodes: [
					{
						id: 10,
						type: 'waypoint',
						x: 1,
						y: 2,
						z: 3,
						created_at: null,
					},
				],
				actions: [
					createAction({
						id: 4,
						status: 'fulfilled',
						result: {
							from_node_id: 1,
							to_node_id: 2,
							skill: 1,
							efficiency: 1,
							duration: 60,
							success: true,
							complete: true,
							nodes: [
								{
									id: 10,
									type: 'waypoint',
									x: 1,
									y: 2,
									z: 3,
								},
							],
							edges: [{ id: 99, node_a_id: 1, node_b_id: 10 }],
							discovered_edge_ids: [99],
							discovered_node_ids: [10],
							edges_discovered: 1,
							waypoints_created: 1,
							path: [1, 10, 2],
						},
					}),
				],
			}).nodes
		).toEqual([
			{
				id: 10,
				type: 'waypoint',
				x: 1,
				y: 2,
				z: 3,
				created_at: null,
			},
		]);
	});

	it('does not use embedded scan result nodes for route positioning', () => {
		expect(
			renderNavigationEdges({
				edgeNodes: [
					{
						id: 20,
						type: 'waypoint',
						x: 4,
						y: 5,
						z: 6,
						created_at: '2026-04-20T00:00:00+00:00',
					},
				],
				actions: [
					createAction({
						id: 4,
						status: 'fulfilled',
						result: {
							from_node_id: 1,
							to_node_id: 2,
							skill: 1,
							efficiency: 1,
							duration: 60,
							success: true,
							complete: true,
							nodes: [
								{
									id: 10,
									type: 'waypoint',
									x: 1,
									y: 2,
									z: 3,
								},
							],
							edges: [{ id: 99, node_a_id: 1, node_b_id: 10 }],
							discovered_edge_ids: [99],
							discovered_node_ids: [10],
							edges_discovered: 1,
							waypoints_created: 1,
							path: [1, 10, 2],
						},
					}),
				],
			}).nodes
		).toEqual([
			{
				id: 20,
				type: 'waypoint',
				x: 4,
				y: 5,
				z: 6,
				created_at: '2026-04-20T00:00:00+00:00',
			},
		]);
	});

	it('records failed scan and jump attempts until replaced', () => {
		expect(
			renderNavigationEdges({
				actions: [
					createAction({
						id: 6,
						status: 'failed',
						params: {
							source_node_id: 3,
							target_node_id: 5,
							distance_ly: 2,
						},
						result: null,
					}),
				],
			}).overlays.at(-1)
		).toMatchObject({
			id: 'scan_route-failed-6',
			type: 'scan',
			status: 'blocked',
			from: 3,
			to: 5,
			pulse: false,
		});
	});

	it('handles mixed sets with at least one hundred known edges', () => {
		const userEdges = Array.from({ length: 100 }, (_, index) =>
			createUserEdge({
				id: index + 1,
				node_a_id: index + 1,
				node_b_id: index + 2,
			})
		);
		const { routes, overlays } = renderNavigationEdges({
			userEdges,
			actions: [
				createAction({
					id: 20,
					type: 'jump',
					status: 'running',
					params: {
						source_node_id: 150,
						target_node_id: 151,
						distance_ly: 3,
					},
				}),
			],
		});

		expect(overlays).toHaveLength(1);
		expect(routes).toHaveLength(100);
		expect(overlays.at(-1)).toMatchObject({
			type: 'jump',
			status: 'plotted',
		});
	});
});
