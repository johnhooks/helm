import { describe, expect, it } from 'vitest';
import type { DraftAction, ShipAction } from '@helm/actions';
import type { KnownPathResult } from '@helm/datacore';
import type { StarNode, UserEdge } from '@helm/types';
import { jumpItinerary, scanItinerary, nodeDetails } from './itineraries';

const details = {
	1: { label: 'Sol', kind: 'star' as const },
	2: { label: 'Waypoint #2', kind: 'waypoint' as const },
	3: { label: 'Waypoint #3', kind: 'waypoint' as const },
	7: { label: 'Tau Ceti', kind: 'star' as const },
};
const scanDraft: DraftAction<'scan_route'> = {
	type: 'scan_route',
	params: { source_node_id: 1, target_node_id: 7, distance_ly: 8 },
};
const jumpDraft: DraftAction<'jump'> = {
	type: 'jump',
	params: { from_node_id: 1, target_node_id: 7, route: [101, 102] },
};
const currentPath: KnownPathResult = {
	reachable: true,
	direct: false,
	nodeIds: [1, 3, 7],
	edgeIds: [201, 202],
	totalDistance: 6,
	nextNodeId: 3,
};
const acceptedEdges: UserEdge[] = [
	{ id: 101, node_a_id: 1, node_b_id: 2, distance: 4, discovered_at: '' },
	{ id: 102, node_a_id: 2, node_b_id: 7, distance: 4, discovered_at: '' },
];

describe('action itineraries', () => {
	it('preserves spectral colors for discovered stars and the scan target', () => {
		const star: StarNode = {
			id: 7,
			node_id: 7,
			title: 'Tau Ceti',
			catalog_id: 'tau',
			spectral_class: 'K',
			x: 0,
			y: 0,
			z: 0,
			mass: null,
			radius: null,
			node_type: 'star',
		};
		const info = nodeDetails(star, 7);
		expect(info).toEqual({
			label: 'Tau Ceti',
			kind: 'star',
			spectralClass: 'K',
		});
		const itinerary = scanItinerary(scanDraft, 'Tau Ceti', {
			...details,
			1: info,
			7: info,
		});
		expect(itinerary.nodes[0].spectralClass).toBe('K');
		expect(itinerary.target?.spectralClass).toBe('K');
		expect(
			nodeDetails({ ...star, spectral_class: null }, 7).spectralClass
		).toBeUndefined();
		expect(
			nodeDetails({ ...star, spectral_class: 'invalid' }, 7).spectralClass
		).toBeUndefined();
	});

	it('keeps an unreached scan target separate from discovered waypoints', () => {
		const action = {
			...scanDraft,
			id: 10,
			ship_post_id: 42,
			status: 'running',
			deferred_until: null,
			created_at: '',
			updated_at: '',
			result: {
				path: [1, 2],
				phases: [],
				discovered_edge_ids: [101],
				discovered_node_ids: [2],
			},
		} as ShipAction<'scan_route'>;
		const itinerary = scanItinerary(action, 'Tau Ceti', details);
		expect(itinerary.nodes.map(({ id }) => id)).toEqual([1, 2, 'scan-10']);
		expect(itinerary.nodes[1].outgoingLeg?.state).toBe('active');
		expect(itinerary.target?.id).toBe(7);
	});

	it('only connects a scan target when the result path reaches it', () => {
		const action = {
			...scanDraft,
			id: 10,
			ship_post_id: 42,
			status: 'fulfilled',
			deferred_until: null,
			created_at: '',
			updated_at: '',
			result: {
				path: [1, 2, 7],
				phases: [],
				discovered_edge_ids: [101, 102],
				discovered_node_ids: [2, 7],
			},
		} as ShipAction<'scan_route'>;
		const itinerary = scanItinerary(action, 'Tau Ceti', details);
		expect(itinerary.nodes.map(({ id }) => id)).toEqual([1, 2, 7]);
		expect(itinerary.target).toBeUndefined();
	});

	it.each(['fulfilled', 'partial'] as const)(
		'keeps an unreached target disconnected after a %s scan stops',
		(status) => {
			const path = status === 'partial' ? [1, 2] : [1];
			const action: ShipAction<'scan_route'> = {
				...scanDraft,
				id: 10,
				ship_post_id: 42,
				status,
				deferred_until: null,
				created_at: '',
				updated_at: '',
				result: {
					path,
					phases: [],
					discovered_node_ids: path.slice(1),
					discovered_edge_ids: status === 'partial' ? [101] : [],
				},
			};
			const itinerary = scanItinerary(action, 'Tau Ceti', details);
			expect(itinerary.nodes.map(({ id }) => id)).toEqual(path);
			expect(itinerary.nodes.at(-1)?.outgoingLeg).toBeUndefined();
			expect(itinerary.target?.id).toBe(7);
			expect(
				itinerary.nodes.every(({ state }) => state === 'complete')
			).toBe(true);
		}
	);

	it('follows accepted jump edges after the shortest path changes', () => {
		const itinerary = jumpItinerary(
			jumpDraft,
			'Tau Ceti',
			currentPath,
			acceptedEdges,
			details
		);
		expect(itinerary.nodes.map(({ id }) => id)).toEqual([1, 2, 7]);
		expect(itinerary.target).toBeUndefined();
	});

	it('does not invent jump stops when neither route source matches', () => {
		const itinerary = jumpItinerary(
			jumpDraft,
			'Tau Ceti',
			currentPath,
			[],
			details
		);
		expect(itinerary.nodes.map(({ id }) => id)).toEqual([1]);
		expect(itinerary.target?.id).toBe(7);
	});
});
