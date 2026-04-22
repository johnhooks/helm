import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Datacore } from '@helm/datacore';
import { syncNodes } from './sync';
import { fetchAllNodes } from './fetch-nodes';
import { fetchAllEdges } from './fetch-edges';

vi.mock( './fetch-nodes', () => ( {
	fetchAllNodes: vi.fn(),
} ) );

vi.mock( './fetch-edges', () => ( {
	fetchAllEdges: vi.fn(),
} ) );

function createDatacoreMock(): Datacore {
	const transaction: Datacore['transaction'] = async <T>( fn: () => Promise<T> ) => fn();

	return {
		insertNode: vi.fn(),
		insertNodes: vi.fn(),
		clearNodes: vi.fn(),
		getNode: vi.fn(),
		insertStar: vi.fn(),
		insertStars: vi.fn(),
		clearStars: vi.fn(),
		getStarMap: vi.fn(),
		getStarsAtNode: vi.fn(),
		insertUserEdge: vi.fn(),
		insertUserEdges: vi.fn(),
		clearUserEdges: vi.fn(),
		getUserEdgesAtNode: vi.fn(),
		hasUserEdgesAtNode: vi.fn(),
		getConnectedNodeIds: vi.fn(),
		getMeta: vi.fn(),
		setMeta: vi.fn(),
		transaction: vi.fn( transaction ) as Datacore['transaction'],
		close: vi.fn(),
	};
}

describe( 'syncNodes', () => {
	beforeEach( () => {
		vi.mocked( fetchAllNodes ).mockReset();
		vi.mocked( fetchAllEdges ).mockReset();
		vi.useFakeTimers();
		vi.setSystemTime( new Date( '2026-04-21T12:00:00Z' ) );
	} );

	it( 'clears and reloads nodes, stars, and user edges inside one transaction', async () => {
		const dc = createDatacoreMock();

		vi.mocked( fetchAllNodes ).mockResolvedValue( [
			{
				id: 1,
				type: 'system',
				x: 10,
				y: 20,
				z: 30,
				created_at: '2026-04-20T00:00:00Z',
				_embedded: {
					'helm:stars': [
						{
							id: 101,
							title: 'Sol',
							node_id: 1,
							catalog_id: 'SOL',
							spectral_class: 'G',
							post_type: 'helm_star',
							x: 10,
							y: 20,
							z: 30,
							mass: 1,
							radius: 1,
							is_primary: true,
						},
					],
				},
			},
		] );
		vi.mocked( fetchAllEdges ).mockResolvedValue( [
			{
				id: 201,
				node_a_id: 1,
				node_b_id: 2,
				distance: 4.5,
				discovered_at: '2026-04-21T00:00:00Z',
			},
		] );

		await expect( syncNodes( dc ) ).resolves.toEqual( {
			nodes: 1,
			stars: 1,
			waypoints: 0,
			edges: 1,
			syncedAt: '2026-04-21T12:00:00.000Z',
		} );

		expect( dc.transaction ).toHaveBeenCalledTimes( 1 );
		expect( dc.clearUserEdges ).toHaveBeenCalledTimes( 1 );
		expect( dc.clearStars ).toHaveBeenCalledTimes( 1 );
		expect( dc.clearNodes ).toHaveBeenCalledTimes( 1 );
		expect( dc.insertNodes ).toHaveBeenCalledWith( [
			{
				id: 1,
				type: 'system',
				x: 10,
				y: 20,
				z: 30,
				created_at: '2026-04-20T00:00:00Z',
			},
		] );
		expect( dc.insertStars ).toHaveBeenCalledTimes( 1 );
		expect( dc.insertUserEdges ).toHaveBeenCalledWith( [
			{
				id: 201,
				node_a_id: 1,
				node_b_id: 2,
				distance: 4.5,
				discovered_at: '2026-04-21T00:00:00Z',
			},
		] );
		expect( dc.setMeta ).toHaveBeenCalledWith( 'cache.synced_at', '2026-04-21T12:00:00.000Z' );
		expect( dc.setMeta ).toHaveBeenCalledWith( 'cache.node_count', '1' );
		expect( dc.setMeta ).toHaveBeenCalledWith( 'cache.star_count', '1' );
		expect( dc.setMeta ).toHaveBeenCalledWith( 'cache.waypoint_count', '0' );
		expect( dc.setMeta ).toHaveBeenCalledWith( 'cache.edge_count', '1' );
	} );

	it( 'does not mutate datacore when edge fetch fails before the transaction', async () => {
		const dc = createDatacoreMock();

		vi.mocked( fetchAllNodes ).mockResolvedValue( [] );
		vi.mocked( fetchAllEdges ).mockRejectedValue( new Error( 'edge fetch failed' ) );

		await expect( syncNodes( dc ) ).rejects.toThrow( 'edge fetch failed' );

		expect( dc.transaction ).not.toHaveBeenCalled();
		expect( dc.clearUserEdges ).not.toHaveBeenCalled();
		expect( dc.clearStars ).not.toHaveBeenCalled();
		expect( dc.clearNodes ).not.toHaveBeenCalled();
	} );
} );
