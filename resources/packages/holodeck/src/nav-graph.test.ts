import { describe, it, expect } from 'vitest';
import { createNavGraph, createEmptyNavGraph } from './nav-graph';

describe('NavGraph', () => {
	describe('loading from graph.json', () => {
		it('loads correct node count', () => {
			const graph = createNavGraph();
			expect(graph.nodeCount).toBe(275);
		});

		it('loads correct edge count', () => {
			const graph = createNavGraph();
			expect(graph.edgeCount).toBe(1);
		});

		it('can retrieve Sol (node 1)', () => {
			const graph = createNavGraph();
			const sol = graph.getNode(1);
			expect(sol).toBeDefined();
			expect(sol!.x).toBe(0);
			expect(sol!.y).toBe(0);
			expect(sol!.z).toBe(0);
			expect(sol!.star?.name).toBe('Sol');
		});

		it('can retrieve Proxima Centauri (node 2)', () => {
			const graph = createNavGraph();
			const proxima = graph.getNode(2);
			expect(proxima).toBeDefined();
			expect(proxima!.star?.name).toBe('Proxima Centauri');
		});

		it('stores master seed', () => {
			const graph = createNavGraph('test-seed');
			expect(graph.masterSeed).toBe('test-seed');
		});
	});

	describe('addNode', () => {
		it('auto-increments ID', () => {
			const graph = createEmptyNavGraph();
			const a = graph.addNode({ type: 'waypoint', x: 1, y: 2, z: 3 });
			const b = graph.addNode({ type: 'waypoint', x: 4, y: 5, z: 6 });
			expect(a.id).toBe(1);
			expect(b.id).toBe(2);
		});

		it('auto-increments from max loaded ID', () => {
			const graph = createNavGraph();
			const node = graph.addNode({ type: 'waypoint', x: 0, y: 0, z: 0 });
			expect(node.id).toBe(277);
			expect(graph.nodeCount).toBe(276);
		});
	});

	describe('addEdge', () => {
		it('creates a new edge', () => {
			const graph = createEmptyNavGraph();
			graph.addNode({ type: 'system', x: 0, y: 0, z: 0 });
			graph.addNode({ type: 'system', x: 1, y: 0, z: 0 });
			const edge = graph.addEdge(1, 2, 1.0);
			expect(edge.from).toBe(1);
			expect(edge.to).toBe(2);
			expect(edge.distance).toBe(1.0);
			expect(edge.traversals).toBe(0);
			expect(graph.edgeCount).toBe(1);
		});

		it('is idempotent', () => {
			const graph = createEmptyNavGraph();
			graph.addNode({ type: 'system', x: 0, y: 0, z: 0 });
			graph.addNode({ type: 'system', x: 1, y: 0, z: 0 });
			const edge1 = graph.addEdge(1, 2, 1.0);
			const edge2 = graph.addEdge(1, 2, 5.0);
			expect(edge1).toBe(edge2);
			expect(graph.edgeCount).toBe(1);
			expect(edge2.distance).toBe(1.0); // original distance preserved
		});

		it('is idempotent regardless of order', () => {
			const graph = createEmptyNavGraph();
			graph.addNode({ type: 'system', x: 0, y: 0, z: 0 });
			graph.addNode({ type: 'system', x: 1, y: 0, z: 0 });
			const edge1 = graph.addEdge(2, 1, 1.0);
			const edge2 = graph.addEdge(1, 2, 5.0);
			expect(edge1).toBe(edge2);
			expect(graph.edgeCount).toBe(1);
		});
	});

	describe('hasEdge', () => {
		it('returns true for existing edge', () => {
			const graph = createNavGraph();
			expect(graph.hasEdge(1, 2)).toBe(true);
		});

		it('is bidirectional', () => {
			const graph = createNavGraph();
			expect(graph.hasEdge(1, 2)).toBe(true);
			expect(graph.hasEdge(2, 1)).toBe(true);
		});

		it('returns false for non-existent edge', () => {
			const graph = createNavGraph();
			expect(graph.hasEdge(1, 100)).toBe(false);
		});
	});

	describe('getEdge', () => {
		it('returns edge regardless of argument order', () => {
			const graph = createNavGraph();
			const edge = graph.getEdge(2, 1);
			expect(edge).toBeDefined();
			expect(edge!.distance).toBeCloseTo(1.295767);
		});
	});

	describe('getNeighbors', () => {
		it('returns neighbors of a connected node', () => {
			const graph = createNavGraph();
			const neighbors = graph.getNeighbors(1);
			expect(neighbors).toContain(2);
		});

		it('returns empty array for isolated node', () => {
			const graph = createNavGraph();
			const neighbors = graph.getNeighbors(100);
			expect(neighbors).toEqual([]);
		});
	});

	describe('findNodeByHash', () => {
		it('finds node by hash', () => {
			const graph = createEmptyNavGraph();
			graph.addNode({
				type: 'waypoint',
				x: 1,
				y: 2,
				z: 3,
				hash: 'abc123',
			});
			const found = graph.findNodeByHash('abc123');
			expect(found).toBeDefined();
			expect(found!.x).toBe(1);
		});

		it('returns undefined for unknown hash', () => {
			const graph = createEmptyNavGraph();
			expect(graph.findNodeByHash('nonexistent')).toBeUndefined();
		});
	});

	describe('distanceBetween', () => {
		it('computes 3D Euclidean distance', () => {
			const graph = createEmptyNavGraph();
			graph.addNode({ type: 'system', x: 0, y: 0, z: 0 });
			graph.addNode({ type: 'system', x: 3, y: 4, z: 0 });
			expect(graph.distanceBetween(1, 2)).toBeCloseTo(5.0);
		});

		it('computes distance between Sol and Proxima Centauri', () => {
			const graph = createNavGraph();
			const dist = graph.distanceBetween(1, 2);
			// Sol is at origin, Proxima is at (-0.4723, -0.3615, -1.1512)
			const expected = Math.sqrt(0.4723 ** 2 + 0.3615 ** 2 + 1.1512 ** 2);
			expect(dist).toBeCloseTo(expected);
		});

		it('returns Infinity for unknown node', () => {
			const graph = createEmptyNavGraph();
			expect(graph.distanceBetween(1, 999)).toBe(Infinity);
		});
	});

	describe('incrementTraversal', () => {
		it('increments traversal count', () => {
			const graph = createNavGraph();
			expect(graph.getEdge(1, 2)!.traversals).toBe(0);
			graph.incrementTraversal(1, 2);
			expect(graph.getEdge(1, 2)!.traversals).toBe(1);
			graph.incrementTraversal(2, 1);
			expect(graph.getEdge(1, 2)!.traversals).toBe(2);
		});
	});

	describe('createEmptyNavGraph', () => {
		it('creates graph with no nodes or edges', () => {
			const graph = createEmptyNavGraph();
			expect(graph.nodeCount).toBe(0);
			expect(graph.edgeCount).toBe(0);
		});
	});
});
