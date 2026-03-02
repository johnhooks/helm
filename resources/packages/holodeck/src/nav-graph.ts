import type { GraphNode, GraphEdge } from './data/graph';
import { GRAPH_NODES, GRAPH_EDGES } from './data/graph';

export class NavGraph {
	readonly masterSeed: string;
	private readonly nodes = new Map<number, GraphNode>();
	private readonly edges = new Map<string, GraphEdge>();
	private readonly adjacency = new Map<number, Set<number>>();
	private nextNodeId: number;

	constructor(nodes: GraphNode[], edges: GraphEdge[], masterSeed: string) {
		this.masterSeed = masterSeed;

		let maxId = 0;
		for (const node of nodes) {
			this.nodes.set(node.id, node);
			if (node.id > maxId) {
				maxId = node.id;
			}
		}
		this.nextNodeId = maxId + 1;

		for (const edge of edges) {
			const key = edgeKey(edge.from, edge.to);
			this.edges.set(key, edge);
			this.ensureAdjacency(edge.from, edge.to);
		}
	}

	get nodeCount(): number {
		return this.nodes.size;
	}

	get edgeCount(): number {
		return this.edges.size;
	}

	getNode(id: number): GraphNode | undefined {
		return this.nodes.get(id);
	}

	getNeighbors(nodeId: number): number[] {
		const set = this.adjacency.get(nodeId);
		return set ? [...set] : [];
	}

	hasEdge(fromId: number, toId: number): boolean {
		return this.edges.has(edgeKey(fromId, toId));
	}

	getEdge(fromId: number, toId: number): GraphEdge | undefined {
		return this.edges.get(edgeKey(fromId, toId));
	}

	addNode(node: Omit<GraphNode, 'id'>): GraphNode {
		const id = this.nextNodeId++;
		const newNode: GraphNode = { ...node, id };
		this.nodes.set(id, newNode);
		return newNode;
	}

	findNodeByHash(hash: string): GraphNode | undefined {
		for (const node of this.nodes.values()) {
			if (node.hash === hash) {
				return node;
			}
		}
		return undefined;
	}

	addEdge(fromId: number, toId: number, distance: number): GraphEdge {
		const key = edgeKey(fromId, toId);
		const existing = this.edges.get(key);
		if (existing) {
			return existing;
		}

		const edge: GraphEdge = {
			from: Math.min(fromId, toId),
			to: Math.max(fromId, toId),
			distance,
			traversals: 0,
		};
		this.edges.set(key, edge);
		this.ensureAdjacency(fromId, toId);
		return edge;
	}

	incrementTraversal(fromId: number, toId: number): void {
		const edge = this.edges.get(edgeKey(fromId, toId));
		if (edge) {
			edge.traversals++;
		}
	}

	distanceBetween(aId: number, bId: number): number {
		const a = this.nodes.get(aId);
		const b = this.nodes.get(bId);
		if (!a || !b) {
			return Infinity;
		}

		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const dz = b.z - a.z;
		return Math.sqrt(dx * dx + dy * dy + dz * dz);
	}

	private ensureAdjacency(a: number, b: number): void {
		if (!this.adjacency.has(a)) {
			this.adjacency.set(a, new Set());
		}
		if (!this.adjacency.has(b)) {
			this.adjacency.set(b, new Set());
		}
		this.adjacency.get(a)!.add(b);
		this.adjacency.get(b)!.add(a);
	}
}

function edgeKey(a: number, b: number): string {
	return `${Math.min(a, b)}-${Math.max(a, b)}`;
}

export function createNavGraph(masterSeed = 'helm'): NavGraph {
	return new NavGraph(GRAPH_NODES, GRAPH_EDGES, masterSeed);
}

export function createEmptyNavGraph(masterSeed = 'helm'): NavGraph {
	return new NavGraph([], [], masterSeed);
}
