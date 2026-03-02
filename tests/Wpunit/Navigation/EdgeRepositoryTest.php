<?php

declare(strict_types=1);

namespace Tests\Wpunit\Navigation;

use Helm\Navigation\Edge;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Navigation\NodeType;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\Navigation\EdgeRepository
 * @covers \Helm\Navigation\Edge
 */
class EdgeRepositoryTest extends WPTestCase
{
    private EdgeRepository $edgeRepository;
    private NodeRepository $nodeRepository;

    public function _before(): void
    {
        parent::_before();

        $this->edgeRepository = helm(EdgeRepository::class);
        $this->nodeRepository = helm(NodeRepository::class);
    }

    private function createStarNode(float $x = 0.0, float $y = 0.0, float $z = 0.0): \Helm\Navigation\Node
    {
        return $this->nodeRepository->create($x, $y, $z, type: NodeType::System);
    }

    public function test_can_create_edge(): void
    {
        $nodeA = $this->createStarNode(0.0, 0.0, 0.0);
        $nodeB = $this->createStarNode(3.0, 4.0, 0.0);

        $edge = $this->edgeRepository->create(
            nodeA: $nodeA->id,
            nodeB: $nodeB->id,
            distance: 5.0,
            discoveredByShipId: 'ship-001',
        );

        $this->assertInstanceOf(Edge::class, $edge);
        $this->assertGreaterThan(0, $edge->id);
        $this->assertSame(5.0, $edge->distance);
        $this->assertSame('ship-001', $edge->discoveredByShipId);
        $this->assertSame(0, $edge->traversalCount);
    }

    public function test_edge_stores_nodes_in_sorted_order(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();

        // Create with nodeB first (higher ID)
        $edge = $this->edgeRepository->create(
            nodeA: $nodeB->id,
            nodeB: $nodeA->id,
            distance: 1.0,
        );

        // Should be stored with lower ID first
        $this->assertSame(min($nodeA->id, $nodeB->id), $edge->nodeAId);
        $this->assertSame(max($nodeA->id, $nodeB->id), $edge->nodeBId);
    }

    public function test_can_get_edge_by_id(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();
        $created = $this->edgeRepository->create($nodeA->id, $nodeB->id, 1.0);

        $fetched = $this->edgeRepository->get($created->id);

        $this->assertNotNull($fetched);
        $this->assertSame($created->id, $fetched->id);
    }

    public function test_get_returns_null_for_unknown_id(): void
    {
        $result = $this->edgeRepository->get(99999);

        $this->assertNull($result);
    }

    public function test_can_get_edge_between_nodes(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();
        $this->edgeRepository->create($nodeA->id, $nodeB->id, 1.0);

        // Should work regardless of order
        $edge1 = $this->edgeRepository->getBetween($nodeA->id, $nodeB->id);
        $edge2 = $this->edgeRepository->getBetween($nodeB->id, $nodeA->id);

        $this->assertNotNull($edge1);
        $this->assertNotNull($edge2);
        $this->assertSame($edge1->id, $edge2->id);
    }

    public function test_create_edge_returns_existing_if_exists(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();

        $first = $this->edgeRepository->create($nodeA->id, $nodeB->id, 5.0);
        $second = $this->edgeRepository->create($nodeA->id, $nodeB->id, 99.0);

        $this->assertSame($first->id, $second->id);
        $this->assertSame(5.0, $second->distance); // Original distance preserved
    }

    public function test_from_node_returns_all_connected_edges(): void
    {
        $center = $this->createStarNode();
        $neighbor1 = $this->createStarNode();
        $neighbor2 = $this->createStarNode();
        $unconnected = $this->createStarNode();

        $this->edgeRepository->create($center->id, $neighbor1->id, 1.0);
        $this->edgeRepository->create($center->id, $neighbor2->id, 2.0);
        $this->edgeRepository->create($neighbor1->id, $unconnected->id, 3.0);

        $edges = $this->edgeRepository->fromNode($center->id);

        $this->assertCount(2, $edges);
    }

    public function test_can_increment_traversal(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();
        $edge = $this->edgeRepository->create($nodeA->id, $nodeB->id, 1.0);

        $this->assertSame(0, $edge->traversalCount);

        $this->edgeRepository->incrementTraversal($edge->id);
        $this->edgeRepository->incrementTraversal($edge->id);

        $updated = $this->edgeRepository->get($edge->id);
        $this->assertSame(2, $updated->traversalCount);
    }

    public function test_increment_traversal_between_nodes(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();
        $this->edgeRepository->create($nodeA->id, $nodeB->id, 1.0);

        $this->edgeRepository->incrementTraversalBetween($nodeA->id, $nodeB->id);

        $edge = $this->edgeRepository->getBetween($nodeA->id, $nodeB->id);
        $this->assertSame(1, $edge->traversalCount);
    }

    public function test_public_edges_returns_well_traveled_edges(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();
        $nodeC = $this->createStarNode();

        $this->edgeRepository->create($nodeA->id, $nodeB->id, 1.0);
        $edge2 = $this->edgeRepository->create($nodeB->id, $nodeC->id, 2.0);

        // Make edge2 well-traveled (threshold is 10)
        for ($i = 0; $i < Edge::PUBLIC_THRESHOLD; $i++) {
            $this->edgeRepository->incrementTraversal($edge2->id);
        }

        $publicEdges = $this->edgeRepository->publicEdges();

        $this->assertCount(1, $publicEdges);
        $this->assertSame($edge2->id, $publicEdges[0]->id);
    }

    public function test_discovered_by_returns_edges_for_ship(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();
        $nodeC = $this->createStarNode();

        $this->edgeRepository->create($nodeA->id, $nodeB->id, 1.0, 'ship-001');
        $this->edgeRepository->create($nodeB->id, $nodeC->id, 2.0, 'ship-002');

        $edges = $this->edgeRepository->discoveredBy('ship-001');

        $this->assertCount(1, $edges);
        $this->assertSame('ship-001', $edges[0]->discoveredByShipId);
    }

    public function test_can_delete_edge(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();
        $edge = $this->edgeRepository->create($nodeA->id, $nodeB->id, 1.0);

        $result = $this->edgeRepository->delete($edge->id);

        $this->assertTrue($result);
        $this->assertNull($this->edgeRepository->get($edge->id));
    }

    public function test_delete_for_node_removes_all_connected_edges(): void
    {
        $center = $this->createStarNode();
        $neighbor1 = $this->createStarNode();
        $neighbor2 = $this->createStarNode();

        $this->edgeRepository->create($center->id, $neighbor1->id, 1.0);
        $this->edgeRepository->create($center->id, $neighbor2->id, 2.0);

        $deleted = $this->edgeRepository->deleteForNode($center->id);

        $this->assertSame(2, $deleted);
        $this->assertCount(0, $this->edgeRepository->fromNode($center->id));
    }

    public function test_exists_returns_correct_boolean(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();
        $nodeC = $this->createStarNode();

        $this->edgeRepository->create($nodeA->id, $nodeB->id, 1.0);

        $this->assertTrue($this->edgeRepository->exists($nodeA->id, $nodeB->id));
        $this->assertTrue($this->edgeRepository->exists($nodeB->id, $nodeA->id)); // Order doesn't matter
        $this->assertFalse($this->edgeRepository->exists($nodeA->id, $nodeC->id));
    }

    public function test_count_returns_correct_number(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();
        $nodeC = $this->createStarNode();

        $this->edgeRepository->create($nodeA->id, $nodeB->id, 1.0);
        $this->edgeRepository->create($nodeB->id, $nodeC->id, 2.0);

        $this->assertSame(2, $this->edgeRepository->count());
    }

    public function test_edge_is_public_based_on_threshold(): void
    {
        $edge = new Edge(
            id: 1,
            nodeAId: 1,
            nodeBId: 2,
            distance: 1.0,
            traversalCount: Edge::PUBLIC_THRESHOLD - 1,
        );

        $this->assertFalse($edge->isPublic());

        $publicEdge = new Edge(
            id: 2,
            nodeAId: 1,
            nodeBId: 2,
            distance: 1.0,
            traversalCount: Edge::PUBLIC_THRESHOLD,
        );

        $this->assertTrue($publicEdge->isPublic());
    }

    public function test_edge_other_node_returns_opposite_node(): void
    {
        $edge = new Edge(id: 1, nodeAId: 5, nodeBId: 10, distance: 1.0);

        $this->assertSame(10, $edge->otherNode(5));
        $this->assertSame(5, $edge->otherNode(10));
    }

    public function test_edge_other_node_throws_for_invalid_node(): void
    {
        $edge = new Edge(id: 1, nodeAId: 5, nodeBId: 10, distance: 1.0);

        $this->expectException(\InvalidArgumentException::class);
        $edge->otherNode(99);
    }

    public function test_edge_connects_node_returns_correct_boolean(): void
    {
        $edge = new Edge(id: 1, nodeAId: 5, nodeBId: 10, distance: 1.0);

        $this->assertTrue($edge->connectsNode(5));
        $this->assertTrue($edge->connectsNode(10));
        $this->assertFalse($edge->connectsNode(15));
    }

    public function test_edge_connects_returns_correct_boolean(): void
    {
        $edge = new Edge(id: 1, nodeAId: 5, nodeBId: 10, distance: 1.0);

        $this->assertTrue($edge->connects(5, 10));
        $this->assertTrue($edge->connects(10, 5)); // Order doesn't matter
        $this->assertFalse($edge->connects(5, 15));
    }

    public function test_save_updates_existing_edge(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();
        $original = $this->edgeRepository->create($nodeA->id, $nodeB->id, 5.0, 'ship-001');

        // Create updated edge with same ID
        $updated = new Edge(
            id: $original->id,
            nodeAId: $original->nodeAId,
            nodeBId: $original->nodeBId,
            distance: 10.0,
            discoveredByShipId: 'ship-002',
            traversalCount: 5,
        );

        $saved = $this->edgeRepository->save($updated);

        $this->assertSame($original->id, $saved->id);
        $this->assertSame(10.0, $saved->distance);
        $this->assertSame('ship-002', $saved->discoveredByShipId);
        $this->assertSame(5, $saved->traversalCount);
    }

    public function test_get_between_returns_null_for_no_edge(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();
        // Don't create an edge

        $result = $this->edgeRepository->getBetween($nodeA->id, $nodeB->id);

        $this->assertNull($result);
    }

    public function test_increment_traversal_between_nonexistent_nodes_does_not_error(): void
    {
        // Should not throw, just do nothing
        $this->edgeRepository->incrementTraversalBetween(99999, 99998);

        $this->assertTrue(true); // If we got here, no exception was thrown
    }

    public function test_from_node_returns_empty_for_unconnected_node(): void
    {
        $lonelyNode = $this->createStarNode();

        $edges = $this->edgeRepository->fromNode($lonelyNode->id);

        $this->assertEmpty($edges);
    }

    public function test_discovered_by_returns_empty_for_unknown_ship(): void
    {
        $edges = $this->edgeRepository->discoveredBy('unknown-ship');

        $this->assertEmpty($edges);
    }

    public function test_edge_from_row_handles_all_fields(): void
    {
        $row = [
            'id' => 42,
            'node_a_id' => 1,
            'node_b_id' => 2,
            'distance' => 7.5,
            'discovered_by_ship_id' => 'test-ship',
            'traversal_count' => 15,
            'algorithm_version' => 2,
            'created_at' => '2024-01-01 12:00:00',
        ];

        $edge = Edge::fromRow($row);

        $this->assertSame(42, $edge->id);
        $this->assertSame(1, $edge->nodeAId);
        $this->assertSame(2, $edge->nodeBId);
        $this->assertSame(7.5, $edge->distance);
        $this->assertSame('test-ship', $edge->discoveredByShipId);
        $this->assertSame(15, $edge->traversalCount);
        $this->assertSame(2, $edge->algorithmVersion);
    }

    public function test_edge_to_row_orders_nodes_correctly(): void
    {
        // Create edge with higher ID first
        $edge = Edge::create(
            nodeA: 100,
            nodeB: 50,
            distance: 5.0,
        );

        $row = $edge->toRow();

        // Should be stored with lower ID first
        $this->assertSame(50, $row['node_a_id']);
        $this->assertSame(100, $row['node_b_id']);
    }
}
