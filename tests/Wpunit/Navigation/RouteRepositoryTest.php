<?php

declare(strict_types=1);

namespace Tests\Wpunit\Navigation;

use Helm\Navigation\Route;
use Helm\Navigation\RouteRepository;
use Helm\Navigation\NodeRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\Navigation\RouteRepository
 * @covers \Helm\Navigation\Route
 */
class RouteRepositoryTest extends WPTestCase
{
    private RouteRepository $routeRepository;
    private NodeRepository $nodeRepository;

    public function _before(): void
    {
        parent::_before();

        $this->routeRepository = helm(RouteRepository::class);
        $this->nodeRepository = helm(NodeRepository::class);
    }

    private function createStarNode(float $x = 0.0, float $y = 0.0, float $z = 0.0): \Helm\Navigation\Node
    {
        $starPostId = $this->factory()->post->create(['post_type' => 'helm_star']);
        return $this->nodeRepository->create($x, $y, $z, starPostId: $starPostId);
    }

    public function test_can_save_route(): void
    {
        $nodeA = $this->createStarNode(0.0, 0.0, 0.0);
        $nodeB = $this->createStarNode(5.0, 0.0, 0.0);
        $nodeC = $this->createStarNode(10.0, 0.0, 0.0);

        $route = Route::create(
            path: [$nodeA->id, $nodeB->id, $nodeC->id],
            totalDistance: 10.0,
            discoveredByShipId: 'ship-001',
            name: 'Test Route',
        );

        $saved = $this->routeRepository->save($route);

        $this->assertInstanceOf(Route::class, $saved);
        $this->assertGreaterThan(0, $saved->id);
        $this->assertSame($nodeA->id, $saved->startNodeId);
        $this->assertSame($nodeC->id, $saved->endNodeId);
        $this->assertSame([$nodeA->id, $nodeB->id, $nodeC->id], $saved->path);
        $this->assertSame(10.0, $saved->totalDistance);
        $this->assertSame(2, $saved->jumpCount);
        $this->assertSame('ship-001', $saved->discoveredByShipId);
        $this->assertSame('Test Route', $saved->name);
        $this->assertTrue($saved->isPrivate());
    }

    public function test_can_get_route_by_id(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();

        $route = Route::create([$nodeA->id, $nodeB->id], 5.0, 'ship-001');
        $saved = $this->routeRepository->save($route);

        $fetched = $this->routeRepository->get($saved->id);

        $this->assertNotNull($fetched);
        $this->assertSame($saved->id, $fetched->id);
    }

    public function test_get_returns_null_for_unknown_id(): void
    {
        $result = $this->routeRepository->get(99999);

        $this->assertNull($result);
    }

    public function test_between_returns_routes_between_nodes(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();
        $nodeC = $this->createStarNode();

        // Route A -> B
        $route1 = Route::create([$nodeA->id, $nodeB->id], 5.0, 'ship-001');
        $this->routeRepository->save($route1);

        // Route A -> C (different destination)
        $route2 = Route::create([$nodeA->id, $nodeC->id], 10.0, 'ship-001');
        $this->routeRepository->save($route2);

        $routes = $this->routeRepository->between($nodeA->id, $nodeB->id);

        $this->assertCount(1, $routes);
        $this->assertSame($nodeB->id, $routes[0]->endNodeId);
    }

    public function test_shortest_between_returns_shortest_route(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();
        $nodeC = $this->createStarNode();

        // Long route A -> C -> B (distance 15)
        $longRoute = Route::create([$nodeA->id, $nodeC->id, $nodeB->id], 15.0, 'ship-001');
        $this->routeRepository->save($longRoute);

        // Short route A -> B (distance 5)
        $shortRoute = Route::create([$nodeA->id, $nodeB->id], 5.0, 'ship-002');
        $this->routeRepository->save($shortRoute);

        $shortest = $this->routeRepository->shortestBetween($nodeA->id, $nodeB->id);

        $this->assertNotNull($shortest);
        $this->assertSame(5.0, $shortest->totalDistance);
    }

    public function test_discovered_by_returns_routes_for_ship(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();

        $route1 = Route::create([$nodeA->id, $nodeB->id], 5.0, 'ship-001');
        $this->routeRepository->save($route1);

        $route2 = Route::create([$nodeB->id, $nodeA->id], 5.0, 'ship-002');
        $this->routeRepository->save($route2);

        $routes = $this->routeRepository->discoveredBy('ship-001');

        $this->assertCount(1, $routes);
        $this->assertSame('ship-001', $routes[0]->discoveredByShipId);
    }

    public function test_public_routes_returns_only_public_routes(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();

        // Private route
        $privateRoute = Route::create([$nodeA->id, $nodeB->id], 5.0, 'ship-001');
        $this->routeRepository->save($privateRoute);

        // Public route (manually make public)
        $publicRoute = Route::create([$nodeB->id, $nodeA->id], 5.0, 'ship-002');
        $saved = $this->routeRepository->save($publicRoute);
        $this->routeRepository->makePublic($saved->id);

        $publicRoutes = $this->routeRepository->publicRoutes();

        $this->assertCount(1, $publicRoutes);
        $this->assertTrue($publicRoutes[0]->isPublic());
    }

    public function test_from_star_returns_routes_starting_from_node(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();
        $nodeC = $this->createStarNode();

        $route1 = Route::create([$nodeA->id, $nodeB->id], 5.0, 'ship-001');
        $this->routeRepository->save($route1);

        $route2 = Route::create([$nodeA->id, $nodeC->id], 10.0, 'ship-001');
        $this->routeRepository->save($route2);

        $route3 = Route::create([$nodeB->id, $nodeC->id], 7.0, 'ship-001');
        $this->routeRepository->save($route3);

        $routes = $this->routeRepository->fromStar($nodeA->id);

        $this->assertCount(2, $routes);
    }

    public function test_accessible_by_returns_discovered_and_public_routes(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();
        $nodeC = $this->createStarNode();

        // Ship's own route
        $ownRoute = Route::create([$nodeA->id, $nodeB->id], 5.0, 'ship-001');
        $this->routeRepository->save($ownRoute);

        // Another ship's private route (should not be accessible)
        $privateRoute = Route::create([$nodeB->id, $nodeC->id], 7.0, 'ship-002');
        $this->routeRepository->save($privateRoute);

        // Public route (accessible to all)
        $publicRoute = Route::create([$nodeC->id, $nodeA->id], 10.0, 'ship-003');
        $saved = $this->routeRepository->save($publicRoute);
        $this->routeRepository->makePublic($saved->id);

        $accessible = $this->routeRepository->accessibleBy('ship-001');

        $this->assertCount(2, $accessible);
    }

    public function test_increment_traversal_increases_count(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();

        $route = Route::create([$nodeA->id, $nodeB->id], 5.0, 'ship-001');
        $saved = $this->routeRepository->save($route);

        $this->assertSame(1, $saved->traversalCount);

        $this->routeRepository->incrementTraversal($saved->id);
        $this->routeRepository->incrementTraversal($saved->id);

        $updated = $this->routeRepository->get($saved->id);
        $this->assertSame(3, $updated->traversalCount);
    }

    public function test_increment_traversal_makes_route_public_at_threshold(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();

        $route = Route::create([$nodeA->id, $nodeB->id], 5.0, 'ship-001');
        $saved = $this->routeRepository->save($route);

        // Increment to threshold (starts at 1, threshold is 5)
        for ($i = 1; $i < Route::PUBLIC_THRESHOLD; $i++) {
            $this->routeRepository->incrementTraversal($saved->id);
        }

        $updated = $this->routeRepository->get($saved->id);
        $this->assertTrue($updated->isPublic());
    }

    public function test_can_delete_route(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();

        $route = Route::create([$nodeA->id, $nodeB->id], 5.0, 'ship-001');
        $saved = $this->routeRepository->save($route);

        $result = $this->routeRepository->delete($saved->id);

        $this->assertTrue($result);
        $this->assertNull($this->routeRepository->get($saved->id));
    }

    public function test_count_returns_correct_totals(): void
    {
        $nodeA = $this->createStarNode();
        $nodeB = $this->createStarNode();

        $route1 = Route::create([$nodeA->id, $nodeB->id], 5.0, 'ship-001');
        $saved1 = $this->routeRepository->save($route1);

        $route2 = Route::create([$nodeB->id, $nodeA->id], 5.0, 'ship-002');
        $saved2 = $this->routeRepository->save($route2);
        $this->routeRepository->makePublic($saved2->id);

        $this->assertSame(2, $this->routeRepository->count());
        $this->assertSame(1, $this->routeRepository->countPublic());
    }

    public function test_route_create_throws_for_path_with_fewer_than_two_nodes(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        Route::create([1], 5.0, 'ship-001');
    }

    public function test_route_node_ids_returns_path(): void
    {
        $route = new Route(
            id: 1,
            startNodeId: 1,
            endNodeId: 3,
            path: [1, 2, 3],
            totalDistance: 10.0,
            jumpCount: 2,
            discoveredByShipId: 'ship-001',
        );

        $this->assertSame([1, 2, 3], $route->nodeIds());
    }

    public function test_route_edge_pairs_returns_consecutive_node_pairs(): void
    {
        $route = new Route(
            id: 1,
            startNodeId: 1,
            endNodeId: 4,
            path: [1, 2, 3, 4],
            totalDistance: 15.0,
            jumpCount: 3,
            discoveredByShipId: 'ship-001',
        );

        $pairs = $route->edgePairs();

        $this->assertSame([
            [1, 2],
            [2, 3],
            [3, 4],
        ], $pairs);
    }

    public function test_route_should_become_public_based_on_threshold(): void
    {
        $privateRoute = new Route(
            id: 1,
            startNodeId: 1,
            endNodeId: 2,
            path: [1, 2],
            totalDistance: 5.0,
            jumpCount: 1,
            discoveredByShipId: 'ship-001',
            traversalCount: Route::PUBLIC_THRESHOLD - 1,
            visibility: Route::VISIBILITY_PRIVATE,
        );

        $this->assertFalse($privateRoute->shouldBecomePublic());

        $readyForPublic = new Route(
            id: 2,
            startNodeId: 1,
            endNodeId: 2,
            path: [1, 2],
            totalDistance: 5.0,
            jumpCount: 1,
            discoveredByShipId: 'ship-001',
            traversalCount: Route::PUBLIC_THRESHOLD,
            visibility: Route::VISIBILITY_PRIVATE,
        );

        $this->assertTrue($readyForPublic->shouldBecomePublic());

        $alreadyPublic = new Route(
            id: 3,
            startNodeId: 1,
            endNodeId: 2,
            path: [1, 2],
            totalDistance: 5.0,
            jumpCount: 1,
            discoveredByShipId: 'ship-001',
            traversalCount: Route::PUBLIC_THRESHOLD,
            visibility: Route::VISIBILITY_PUBLIC,
        );

        $this->assertFalse($alreadyPublic->shouldBecomePublic());
    }
}
