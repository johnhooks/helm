<?php

declare(strict_types=1);

namespace Tests\Wpunit\Navigation;

use DateTimeImmutable;
use Helm\Lib\Date;
use Helm\Celestials\CelestialRepository;
use Helm\Core\ErrorCode;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\KnownPathResult;
use Helm\Navigation\NavComputer;
use Helm\Navigation\NavigationService;
use Helm\Navigation\RouteRepository;
use Helm\Navigation\UserEdge;
use Helm\Stars\StarRepository;
use InvalidArgumentException;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Navigation\NavigationService
 * @covers \Helm\Navigation\KnownPathResult
 * @property WpunitTester $tester
 */
class KnownPathTest extends WPTestCase
{
    private NavigationService $service;
    private int $a;
    private int $b;
    private int $c;
    private int $d;

    public function set_up(): void
    {
        parent::set_up();
        Date::setTestNow(new DateTimeImmutable('2026-01-01T00:00:00+00:00'));
        $this->tester->haveOrigin();
        $this->service = helm(NavigationService::class);
        $nodes = helm(NodeRepository::class);
        $this->a = $nodes->create(0, 0, 0)->id;
        $this->b = $nodes->create(1, 0, 0)->id;
        $this->c = $nodes->create(2, 0, 0)->id;
        $this->d = $nodes->create(3, 0, 0)->id;
    }

    public function tear_down(): void
    {
        Date::setTestNow(null);
        parent::tear_down();
    }

    private function connect(int $from, int $to, float $distance, int $userId = 42): int
    {
        $edge = helm(EdgeRepository::class)->create($from, $to, $distance);
        helm(UserEdgeRepository::class)->upsert($userId, $edge->id);
        return $edge->id;
    }

    public function test_same_node_and_unreachable_match_frontend_results(): void
    {
        $this->assertEquals(new KnownPathResult(true, false, [$this->a], [], 0.0, null), $this->service->findKnownPath(42, $this->a, $this->a));
        $this->assertEquals(new KnownPathResult(false, false, [], [], 0.0, null), $this->service->findKnownPath(42, $this->a, $this->d));
    }

    public function test_direct_path_works_in_reverse(): void
    {
        $edge = $this->connect($this->a, $this->b, 1.5);
        $this->assertEquals(
            new KnownPathResult(true, true, [$this->b, $this->a], [$edge], 1.5, $this->a),
            $this->service->findKnownPath(42, $this->b, $this->a)
        );
    }

    public function test_shortest_distance_wins_over_fewer_hops_and_handles_cycles(): void
    {
        $this->connect($this->a, $this->d, 10);
        $ab = $this->connect($this->a, $this->b, 1);
        $bc = $this->connect($this->b, $this->c, 1);
        $cd = $this->connect($this->c, $this->d, 1);
        $this->connect($this->a, $this->c, 4);
        $result = $this->service->findKnownPath(42, $this->a, $this->d);
        $this->assertEquals(new KnownPathResult(true, false, [$this->a, $this->b, $this->c, $this->d], [$ab, $bc, $cd], 3.0, $this->b), $result);
        $loaded = $this->service->getRouteEdges(42, $result->edgeIds);
        $this->assertTrue($this->service->validateRouteEdges($this->a, $this->d, $loaded));
    }

    public function test_other_players_edges_do_not_connect_disconnected_components(): void
    {
        $this->connect($this->a, $this->b, 1);
        $this->connect($this->b, $this->c, 1, 43);
        $this->connect($this->c, $this->d, 1);
        $this->assertFalse($this->service->findKnownPath(42, $this->a, $this->d)->reachable);
    }

    public function test_equal_distances_keep_first_discovered_queue_order(): void
    {
        $ac = $this->connect($this->a, $this->c, 1);
        $this->connect($this->a, $this->b, 1);
        $cd = $this->connect($this->c, $this->d, 1);
        $this->connect($this->b, $this->d, 1);
        $this->assertSame([$ac, $cd], $this->service->findKnownPath(42, $this->a, $this->d)->edgeIds);
    }

    public function test_limit_is_not_reported_as_unreachable_or_a_provisional_path(): void
    {
        $this->connect($this->a, $this->d, 10);
        $this->connect($this->a, $this->b, 1);
        $this->connect($this->b, $this->d, 1);
        $error = $this->service->findKnownPath(42, $this->a, $this->d, 1);
        $this->assertWPError($error);
        $this->assertTrue(ErrorCode::NavigationSearchLimit->matches($error));
        $this->assertSame(1, $error->get_error_data()['max_expansions']);
        $this->assertSame(2.0, $this->service->findKnownPath(42, $this->a, $this->d, 2)->totalDistance);
    }

    public function test_missing_nodes_and_invalid_limits_are_rejected(): void
    {
        $this->assertTrue(ErrorCode::NavigationInvalidNode->matches($this->service->findKnownPath(42, 999999999, $this->a)));
        $this->assertTrue(ErrorCode::NavigationInvalidTarget->matches($this->service->findKnownPath(42, $this->a, 999999999)));
        foreach ([0, NavigationService::MAX_PATH_EXPANSIONS + 1] as $limit) {
            try {
                $this->service->findKnownPath(42, $this->a, $this->b, $limit);
                $this->fail('Expected invalid limit rejection.');
            } catch (InvalidArgumentException $error) {
                $this->assertStringContainsString('Path expansion limit', $error->getMessage());
            }
        }
    }

    public function test_loads_only_expanded_nodes_without_writes(): void
    {
        $repository = $this->createMock(UserEdgeRepository::class);
        $repository->expects($this->once())->method('fromNode')->with(42, $this->a)
            ->willReturn([new UserEdge(42, 123, $this->a, $this->b, 1.0, '2026-01-01T00:00:00+00:00')]);
        $repository->expects($this->never())->method('paginate');
        $repository->expects($this->never())->method('upsert');
        $service = new NavigationService(
            helm(NavComputer::class),
            helm(NodeRepository::class),
            helm(EdgeRepository::class),
            $repository,
            helm(RouteRepository::class),
            helm(StarRepository::class),
            helm(CelestialRepository::class)
        );
        $writes = [];
        $capture = static function (string $query) use (&$writes): string {
            if (preg_match('/^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i', $query)) {
                $writes[] = $query;
            }
            return $query;
        };
        add_filter('query', $capture);
        try {
            $result = $service->findKnownPath(42, $this->a, $this->b, 1);
        } finally {
            remove_filter('query', $capture);
        }
        $this->assertTrue($result->reachable);
        $this->assertSame([], $writes);
    }
}
