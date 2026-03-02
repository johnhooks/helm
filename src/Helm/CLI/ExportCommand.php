<?php

declare(strict_types=1);

namespace Helm\CLI;

use Helm\Celestials\CelestialRepository;
use Helm\Celestials\CelestialType;
use Helm\Database\Schema;
use Helm\Navigation\Edge;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Navigation\Node;
use Helm\Navigation\NodeType;
use Helm\Stars\StarRepository;
use WP_CLI;

/**
 * Export game data for the holodeck and workbench.
 */
class ExportCommand
{
    public function __construct(
        private readonly NodeRepository $nodeRepository,
        private readonly StarRepository $starRepository,
        private readonly CelestialRepository $celestialRepository,
    ) {
    }

    /**
     * Export the navigation graph as JSON.
     *
     * Outputs nodes (with star metadata), edges, and summary stats.
     * Pipe to a file to save: wp helm export graph > tests/_data/catalog/graph.json
     *
     * By default exports all nodes. Use --node and --radius to export
     * a sphere around a specific node.
     *
     * ## OPTIONS
     *
     * [--node=<id>]
     * : Center the export on this node ID. Requires --radius.
     *
     * [--radius=<ly>]
     * : Export nodes within this many light-years of --node. Default: 20.
     *
     * ## EXAMPLES
     *
     *     # Export entire graph
     *     wp helm export graph
     *
     *     # Export 20 ly sphere around node 1 (Sol)
     *     wp helm export graph --node=1 --radius=20
     *
     *     # Export to catalog file
     *     wp helm export graph --node=1 --radius=20 > tests/_data/catalog/graph.json
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function graph(array $args, array $assoc_args): void
    {
        $nodeId = isset($assoc_args['node']) ? (int) $assoc_args['node'] : null;
        $radius = (float) ($assoc_args['radius'] ?? 20.0);

        // Resolve nodes
        if ($nodeId !== null) {
            $centerNode = $this->nodeRepository->get($nodeId);
            if ($centerNode === null) {
                WP_CLI::error(sprintf('Node %d not found', $nodeId));
            }

            $nodes = $this->nodeRepository->withinDistance(
                $centerNode->x,
                $centerNode->y,
                $centerNode->z,
                $radius
            );

            // Include the center node itself
            $nodeMap = [];
            $nodeMap[$centerNode->id] = $centerNode;
            foreach ($nodes as $node) {
                $nodeMap[$node->id] = $node;
            }

            WP_CLI::debug(sprintf(
                'Found %d nodes within %.1f ly of node %d',
                count($nodeMap),
                $radius,
                $nodeId
            ));
        } else {
            $result = $this->nodeRepository->paginate(null, 1, 100000);
            $nodeMap = [];
            foreach ($result['nodes'] as $node) {
                $nodeMap[$node->id] = $node;
            }

            WP_CLI::debug(sprintf('Exporting all %d nodes', count($nodeMap)));
        }

        // Load edges that connect nodes in our set
        $edges = $this->loadEdgesForNodes(array_keys($nodeMap));

        // Load star data for system nodes
        $systemNodeIds = array_keys(
            array_filter($nodeMap, fn(Node $n) => $n->isSystem())
        );
        $starData = $this->loadStarData($systemNodeIds);

        // Build output
        $output = [
            'meta' => $this->buildMeta($nodeId, $radius, $nodeMap, $edges),
            'nodes' => $this->buildNodes($nodeMap, $starData),
            'edges' => $this->buildEdges($edges),
        ];

        // Output JSON to stdout (progress/debug goes to stderr via WP_CLI)
        fwrite(STDOUT, json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
    }

    /**
     * Load all edges where both endpoints are in the node set.
     *
     * @param int[] $nodeIds
     * @return Edge[]
     */
    private function loadEdgesForNodes(array $nodeIds): array
    {
        global $wpdb;

        if ($nodeIds === []) {
            return [];
        }

        $nodeIdSet = array_flip($nodeIds);
        $placeholders = implode(',', array_fill(0, count($nodeIds), '%d'));

        // Get edges where at least one endpoint is in our set
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE node_a_id IN ($placeholders) OR node_b_id IN ($placeholders)",
                Schema::table(Schema::TABLE_NAV_EDGES),
                ...array_merge($nodeIds, $nodeIds)
            ),
            ARRAY_A
        );

        // Filter to edges where BOTH endpoints are in our set
        $edges = [];
        foreach ($rows as $row) {
            $edge = Edge::fromRow($row);
            if (isset($nodeIdSet[$edge->nodeAId]) && isset($nodeIdSet[$edge->nodeBId])) {
                $edges[] = $edge;
            }
        }

        return $edges;
    }

    /**
     * Load star metadata for system nodes via celestials.
     *
     * @param int[] $nodeIds
     * @return array<int, array<string, mixed>> Keyed by node ID
     */
    private function loadStarData(array $nodeIds): array
    {
        if ($nodeIds === []) {
            return [];
        }

        // Batch load celestials for all system nodes
        $celestials = $this->celestialRepository->findByNodeIds($nodeIds, CelestialType::Star);

        // Map node ID → star post ID (first star per node)
        $nodeStarPostIds = [];
        foreach ($celestials as $celestial) {
            if (!isset($nodeStarPostIds[$celestial->nodeId])) {
                $nodeStarPostIds[$celestial->nodeId] = $celestial->contentId;
            }
        }

        // Batch load star posts
        $starPostIds = array_unique(array_values($nodeStarPostIds));
        $starPosts = $this->starRepository->findByPostIds($starPostIds);

        // Build star data keyed by node ID
        $starData = [];
        foreach ($nodeStarPostIds as $nodeId => $postId) {
            $starPost = $starPosts[$postId] ?? null;
            if ($starPost === null) {
                continue;
            }

            $star = $starPost->toStar();
            $starData[$nodeId] = [
                'catalogId' => $star->id,
                'name' => $star->name,
                'spectralType' => $star->spectralType,
                'spectralClass' => $star->spectralClass(),
                'distanceLy' => $star->distanceLy,
                'luminosity' => $star->luminosity(),
                'temperature' => $star->temperature(),
                'mass' => $star->mass(),
            ];
        }

        return $starData;
    }

    /**
     * Build metadata section.
     *
     * @param int|null $centerNodeId
     * @param float $radius
     * @param array<int, Node> $nodeMap
     * @param Edge[] $edges
     * @return array<string, mixed>
     */
    private function buildMeta(?int $centerNodeId, float $radius, array $nodeMap, array $edges): array
    {
        $systemCount = count(array_filter($nodeMap, fn(Node $n) => $n->isSystem()));
        $waypointCount = count($nodeMap) - $systemCount;

        $meta = [
            'exportedAt' => gmdate('c'),
            'nodeCount' => count($nodeMap),
            'systemCount' => $systemCount,
            'waypointCount' => $waypointCount,
            'edgeCount' => count($edges),
        ];

        if ($centerNodeId !== null) {
            $meta['center'] = $centerNodeId;
            $meta['radius'] = $radius;
        }

        return $meta;
    }

    /**
     * Build nodes array for output.
     *
     * @param array<int, Node> $nodeMap
     * @param array<int, array<string, mixed>> $starData
     * @return array<array<string, mixed>>
     */
    private function buildNodes(array $nodeMap, array $starData): array
    {
        $nodes = [];
        foreach ($nodeMap as $node) {
            $entry = [
                'id' => $node->id,
                'type' => $node->type === NodeType::System ? 'system' : 'waypoint',
                'x' => round($node->x, 6),
                'y' => round($node->y, 6),
                'z' => round($node->z, 6),
            ];

            if (isset($starData[$node->id])) {
                $entry['star'] = $starData[$node->id];
            }

            $nodes[] = $entry;
        }

        return $nodes;
    }

    /**
     * Build edges array for output.
     *
     * @param Edge[] $edges
     * @return array<array<string, mixed>>
     */
    private function buildEdges(array $edges): array
    {
        return array_map(fn(Edge $edge) => [
            'from' => $edge->nodeAId,
            'to' => $edge->nodeBId,
            'distance' => round($edge->distance, 6),
            'traversals' => $edge->traversalCount,
        ], $edges);
    }
}
