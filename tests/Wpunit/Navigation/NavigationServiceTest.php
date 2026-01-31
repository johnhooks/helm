<?php

declare(strict_types=1);

namespace Tests\Wpunit\Navigation;

use Helm\Core\ErrorCode;
use Helm\Navigation\EdgeInfo;
use Helm\Navigation\EdgeRepository;
use Helm\Navigation\NavigationService;
use Helm\Navigation\NearbyStar;
use Helm\Navigation\Node;
use Helm\Navigation\NodeRepository;
use Helm\PostTypes\PostTypeRegistry;
use Helm\Stars\Star;
use Helm\Stars\StarRepository;
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
    private StarRepository $starRepository;

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();

        $this->service = helm(NavigationService::class);
        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);
        $this->starRepository = helm(StarRepository::class);
    }

    /**
     * Helper to create a star with its nav node.
     *
     * @return array{star: \Helm\Stars\StarPost, node: Node}
     */
    private function createStarWithNode(float $x, float $y, float $z, string $catalogId, ?string $name = null): array
    {
        $star = new Star(
            id: $catalogId,
            ra: 0.0,
            dec: 0.0,
            distanceLy: sqrt($x * $x + $y * $y + $z * $z),
            spectralType: 'G2V',
            name: $name,
        );

        $starPost = $this->starRepository->save($star);
        $node = $this->nodeRepository->getByStarPostId($starPost->postId());

        // Update node coordinates (they're generated from ra/dec by default)
        $updatedNode = new Node(
            id: $node->id,
            x: $x,
            y: $y,
            z: $z,
            starPostId: $node->starPostId,
            hash: $node->hash,
            algorithmVersion: $node->algorithmVersion,
        );
        $node = $this->nodeRepository->save($updatedNode);

        return ['star' => $starPost, 'node' => $node];
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

    public function test_get_nearby_stars_returns_stars_within_range(): void
    {
        // Create origin star
        $origin = $this->createStarWithNode(0.0, 0.0, 0.0, 'SOL', 'Sol');

        // Create nearby star (distance = 3)
        $proxima = $this->createStarWithNode(3.0, 0.0, 0.0, 'PROXIMA', 'Proxima');

        // Create far star (distance = 10)
        $far = $this->createStarWithNode(10.0, 0.0, 0.0, 'FAR_STAR', 'Far Star');

        $nearby = $this->service->getNearbyStars($origin['node']->id, 5.0);

        $this->assertCount(1, $nearby);
        $this->assertInstanceOf(NearbyStar::class, $nearby[0]);
        $this->assertSame($proxima['node']->id, $nearby[0]->node->id);
    }

    public function test_get_nearby_stars_returns_empty_for_no_stars_in_range(): void
    {
        // Create origin star
        $origin = $this->createStarWithNode(0.0, 0.0, 0.0, 'SOL', 'Sol');

        // Create far star (distance = 20)
        $this->createStarWithNode(20.0, 0.0, 0.0, 'FAR_STAR', 'Far Star');

        $nearby = $this->service->getNearbyStars($origin['node']->id, 5.0);

        $this->assertEmpty($nearby);
    }

    public function test_get_nearby_stars_returns_empty_for_invalid_node(): void
    {
        $nearby = $this->service->getNearbyStars(99999, 5.0);

        $this->assertEmpty($nearby);
    }

    public function test_get_nearby_stars_includes_star_info(): void
    {
        $origin = $this->createStarWithNode(0.0, 0.0, 0.0, 'SOL', 'Sol');
        $proxima = $this->createStarWithNode(2.0, 0.0, 0.0, 'PROXIMA', 'Proxima Centauri');

        $nearby = $this->service->getNearbyStars($origin['node']->id, 5.0);

        $this->assertCount(1, $nearby);
        $this->assertSame('Proxima Centauri', $nearby[0]->star->displayName());
    }

    public function test_get_nearby_stars_includes_distance(): void
    {
        $origin = $this->createStarWithNode(0.0, 0.0, 0.0, 'SOL', 'Sol');
        $this->createStarWithNode(3.0, 4.0, 0.0, 'NEARBY', 'Nearby'); // distance = 5

        $nearby = $this->service->getNearbyStars($origin['node']->id, 10.0);

        $this->assertCount(1, $nearby);
        $this->assertEqualsWithDelta(5.0, $nearby[0]->distance, 0.0001);
    }

    public function test_get_nearby_stars_includes_route_status(): void
    {
        $origin = $this->createStarWithNode(0.0, 0.0, 0.0, 'SOL', 'Sol');
        $withRoute = $this->createStarWithNode(2.0, 0.0, 0.0, 'CONNECTED', 'Connected');
        $noRoute = $this->createStarWithNode(3.0, 0.0, 0.0, 'DISCONNECTED', 'Disconnected');

        // Create edge to "Connected" star only
        $this->edgeRepository->create($origin['node']->id, $withRoute['node']->id, 2.0);

        $nearby = $this->service->getNearbyStars($origin['node']->id, 5.0);

        $this->assertCount(2, $nearby);

        // Find each star in results
        $connectedResult = null;
        $disconnectedResult = null;
        foreach ($nearby as $star) {
            if ($star->node->id === $withRoute['node']->id) {
                $connectedResult = $star;
            }
            if ($star->node->id === $noRoute['node']->id) {
                $disconnectedResult = $star;
            }
        }

        $this->assertNotNull($connectedResult);
        $this->assertNotNull($disconnectedResult);
        $this->assertTrue($connectedResult->hasRoute);
        $this->assertFalse($disconnectedResult->hasRoute);
    }

    public function test_get_nearby_stars_sorted_by_distance(): void
    {
        $origin = $this->createStarWithNode(0.0, 0.0, 0.0, 'SOL', 'Sol');
        $this->createStarWithNode(5.0, 0.0, 0.0, 'FAR', 'Far'); // distance = 5
        $this->createStarWithNode(2.0, 0.0, 0.0, 'CLOSE', 'Close'); // distance = 2
        $this->createStarWithNode(3.0, 0.0, 0.0, 'MIDDLE', 'Middle'); // distance = 3

        $nearby = $this->service->getNearbyStars($origin['node']->id, 10.0);

        $this->assertCount(3, $nearby);
        $this->assertEqualsWithDelta(2.0, $nearby[0]->distance, 0.0001);
        $this->assertEqualsWithDelta(3.0, $nearby[1]->distance, 0.0001);
        $this->assertEqualsWithDelta(5.0, $nearby[2]->distance, 0.0001);
    }

    public function test_get_nearby_stars_excludes_waypoints(): void
    {
        $origin = $this->createStarWithNode(0.0, 0.0, 0.0, 'SOL', 'Sol');
        $this->createStarWithNode(2.0, 0.0, 0.0, 'NEARBY', 'Nearby');

        // Create a waypoint (not a star)
        $this->nodeRepository->create(x: 1.0, y: 0.0, z: 0.0, hash: 'waypoint_hash');

        $nearby = $this->service->getNearbyStars($origin['node']->id, 5.0);

        // Should only include the star, not the waypoint
        $this->assertCount(1, $nearby);
        $this->assertTrue($nearby[0]->node->isStar());
    }

    public function test_get_nearby_stars_batch_loads_stars(): void
    {
        $origin = $this->createStarWithNode(0.0, 0.0, 0.0, 'SOL', 'Sol');

        // Create multiple nearby stars
        for ($i = 1; $i <= 5; $i++) {
            $this->createStarWithNode((float) $i, 0.0, 0.0, "STAR_$i", "Star $i");
        }

        $nearby = $this->service->getNearbyStars($origin['node']->id, 10.0);

        // All 5 stars should be loaded
        $this->assertCount(5, $nearby);

        // Each should have valid star data
        foreach ($nearby as $nearbyStar) {
            $this->assertNotNull($nearbyStar->star);
            $this->assertNotEmpty($nearbyStar->star->displayName());
        }
    }
}
