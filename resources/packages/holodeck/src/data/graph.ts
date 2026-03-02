import graphData from '../../../../../tests/_data/catalog/graph.json';

export interface GraphStar {
	catalogId: string;
	name: string | null;
	spectralType: string;
	spectralClass: string;
	distanceLy: number;
	luminosity: number;
	temperature: number | null;
	mass: number | null;
}

export interface GraphNode {
	id: number;
	type: string;
	x: number;
	y: number;
	z: number;
	hash?: string;
	star?: GraphStar;
}

export interface GraphEdge {
	from: number;
	to: number;
	distance: number;
	traversals: number;
}

interface GraphMeta {
	exportedAt: string;
	nodeCount: number;
	systemCount: number;
	waypointCount: number;
	edgeCount: number;
	center: number;
	radius: number;
}

interface GraphFile {
	meta: GraphMeta;
	nodes: GraphNode[];
	edges: GraphEdge[];
}

const data = graphData as GraphFile;

export const GRAPH_META = data.meta;
export const GRAPH_NODES: GraphNode[] = data.nodes;
export const GRAPH_EDGES: GraphEdge[] = data.edges;

export function getGraphNode(id: number): GraphNode | undefined {
	return GRAPH_NODES.find((n) => n.id === id);
}
