<?php

declare(strict_types=1);

namespace Tests\Wpunit\Navigation;

use Helm\Core\ErrorCode;
use Helm\Navigation\EdgeInfo;
use Helm\Navigation\EdgeRepository;
use Helm\Navigation\NavigationService;
use Helm\Navigation\Node;
use Helm\Navigation\NodeRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Navigation\NavigationService
 * @covers \Helm\Navigation\EdgeInfo
 *
 * Tests for NavigationService - pure graph operations.
 * Ship/jump behavior is tested in ShipLink tests.
 *
 * @property WpunitTester $tester
 */
class NavigationServiceTest extends WPTestCase
{
    private NavigationService $service;
    private NodeRepository $nodeRepository;
    private EdgeRepository $edgeRepository;

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();

        $this->service = helm(NavigationService::class);
        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);
    }

    public function test_get_edge_info_returns_edge_info_for_valid_edge(): void
    {
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 3.0, y: 0.0, z: 0.0);

        $this->edgeRepository->create($nodeA->id, $nodeB->id, 3.0);

        $result = $this->service->getEdgeInfo($nodeA->id, $nodeB->id);

        $this->assertInstanceOf(EdgeInfo::class, $result);
        $this->assertSame($nodeA->id, $result->fromNodeId);
        $this->assertSame($nodeB->id, $result->toNodeId);
        $this->assertSame(3.0, $result->distance);
    }

    public function test_get_edge_info_fails_without_edge(): void
    {
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 3.0, y: 0.0, z: 0.0);

        // No edge created
        $result = $this->service->getEdgeInfo($nodeA->id, $nodeB->id);

        $this->assertInstanceOf(\WP_Error::class, $result);
        $this->assertTrue(ErrorCode::NavigationNoRoute->matches($result));
    }

    public function test_get_edge_info_fails_for_invalid_from_node(): void
    {
        $nodeB = $this->nodeRepository->create(x: 3.0, y: 0.0, z: 0.0);

        $result = $this->service->getEdgeInfo(99999, $nodeB->id);

        $this->assertInstanceOf(\WP_Error::class, $result);
        $this->assertTrue(ErrorCode::NavigationInvalidNode->matches($result));
    }

    public function test_get_edge_info_fails_for_invalid_to_node(): void
    {
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);

        $result = $this->service->getEdgeInfo($nodeA->id, 99999);

        $this->assertInstanceOf(\WP_Error::class, $result);
        $this->assertTrue(ErrorCode::NavigationInvalidTarget->matches($result));
    }

    public function test_get_connected_nodes_returns_connected_nodes(): void
    {
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 3.0, y: 0.0, z: 0.0);
        $nodeC = $this->nodeRepository->create(x: 0.0, y: 5.0, z: 0.0);
        $nodeD = $this->nodeRepository->create(x: 20.0, y: 0.0, z: 0.0); // Disconnected

        // Connect A to B and C
        $this->edgeRepository->create($nodeA->id, $nodeB->id, 3.0);
        $this->edgeRepository->create($nodeA->id, $nodeC->id, 5.0);

        $connected = $this->service->getConnectedNodes($nodeA->id);

        $connectedIds = array_map(fn(array $item) => $item['node']->id, $connected);

        $this->assertContains($nodeB->id, $connectedIds);
        $this->assertContains($nodeC->id, $connectedIds);
        $this->assertNotContains($nodeD->id, $connectedIds);
    }

    public function test_get_connected_nodes_includes_distances(): void
    {
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 3.0, y: 0.0, z: 0.0);

        $this->edgeRepository->create($nodeA->id, $nodeB->id, 3.0);

        $connected = $this->service->getConnectedNodes($nodeA->id);

        $this->assertCount(1, $connected);
        $this->assertSame(3.0, $connected[0]['distance']);
    }

    public function test_get_connected_nodes_returns_empty_for_isolated_node(): void
    {
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);

        $connected = $this->service->getConnectedNodes($nodeA->id);

        $this->assertEmpty($connected);
    }

    public function test_calculate_distance_returns_correct_distance(): void
    {
        // 3-4-5 right triangle
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 3.0, y: 4.0, z: 0.0);

        $distance = $this->service->calculateDistance($nodeA->id, $nodeB->id);

        $this->assertEqualsWithDelta(5.0, $distance, 0.0001);
    }

    public function test_calculate_distance_returns_null_for_invalid_nodes(): void
    {
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);

        $distance = $this->service->calculateDistance($nodeA->id, 99999);

        $this->assertNull($distance);
    }

    public function test_get_node_returns_node(): void
    {
        $created = $this->nodeRepository->create(x: 1.0, y: 2.0, z: 3.0);

        $node = $this->service->getNode($created->id);

        $this->assertInstanceOf(Node::class, $node);
        $this->assertSame($created->id, $node->id);
        $this->assertSame(1.0, $node->x);
        $this->assertSame(2.0, $node->y);
        $this->assertSame(3.0, $node->z);
    }

    public function test_get_node_returns_null_for_invalid_id(): void
    {
        $node = $this->service->getNode(99999);

        $this->assertNull($node);
    }

    public function test_scan_returns_scan_result(): void
    {
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 5.0, y: 0.0, z: 0.0);

        $result = $this->service->scan(
            fromNodeId: $nodeA->id,
            toNodeId: $nodeB->id,
            skill: 0.8,
            efficiency: 0.9,
        );

        // ScanResult should be returned (success or failure based on scan logic)
        $this->assertInstanceOf(\Helm\Navigation\ScanResult::class, $result);
    }

    public function test_scan_fails_for_invalid_nodes(): void
    {
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);

        $result = $this->service->scan(
            fromNodeId: $nodeA->id,
            toNodeId: 99999,
            skill: 0.8,
            efficiency: 0.9,
        );

        // Should return failure result
        $this->assertTrue($result->failed);
    }
}
