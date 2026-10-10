<?php

declare(strict_types=1);

namespace Tests\Wpunit\Abilities\Player;

use Helm\Abilities\Player\PlanRoute;
use Helm\Core\ErrorCode;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\NavigationService;
use Helm\Rest\ShipActionsController;
use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\ShipLink\ShipFactory;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;
use WP_REST_Request;

/**
 * @covers \Helm\Abilities\Player\PlanRoute
 * @property WpunitTester $tester
 */
class PlanRouteTest extends WPTestCase
{
    private int $owner;
    private int $other;
    private int $origin;
    private int $target;
    private int $ship;

    public function set_up(): void
    {
        parent::set_up();
        $this->tester->haveOrigin();
        $this->owner = self::factory()->user->create(['role' => 'subscriber']);
        $this->other = self::factory()->user->create(['role' => 'administrator']);
        $nodes = helm(NodeRepository::class);
        $this->origin = $nodes->create(0, 0, 0)->id;
        $this->target = $nodes->create(3, 0, 0)->id;
        $this->ship = $this->tester->haveShip(['ownerId' => $this->owner, 'node_id' => $this->origin])->postId();
        wp_set_current_user($this->owner);
    }

    private function connect(int $from, int $to, float $distance, ?int $owner = null): int
    {
        $edge = helm(EdgeRepository::class)->create($from, $to, $distance);
        helm(UserEdgeRepository::class)->upsert($owner ?? $this->owner, $edge->id);
        return $edge->id;
    }

    private function input(): array
    {
        return ['ship_id' => $this->ship, 'target_node_id' => $this->target];
    }

    public function test_multileg_plan_has_directed_legs_comparison_and_jump_compatible_route_without_writes(): void
    {
        $via = helm(NodeRepository::class)->create(1, 1, 0)->id;
        $first = $this->connect($via, $this->origin, 2);
        $second = $this->connect($this->target, $via, 3);
        $this->connect($this->origin, $this->target, 10);
        $writes = [];
        $capture = static function (string $query) use (&$writes): string {
            if (preg_match('/^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i', $query)) {
                $writes[] = $query;
            }
            return $query;
        };
        add_filter('query', $capture);
        try {
            $result = wp_get_ability('helm/plan-route')->execute($this->input());
        } finally {
            remove_filter('query', $capture);
        }
        $this->assertSame([], $writes);
        $this->assertTrue($result['reachable']);
        $this->assertFalse($result['direct']);
        $this->assertFalse($result['already_at_target']);
        $this->assertSame([$this->origin, $via, $this->target], $result['node_ids']);
        $this->assertSame([$first, $second], $result['route']);
        $this->assertEquals([
            ['edge_id' => $first, 'from_node_id' => $this->origin, 'to_node_id' => $via, 'distance_ly' => 2.0],
            ['edge_id' => $second, 'from_node_id' => $via, 'to_node_id' => $this->target, 'distance_ly' => 3.0],
        ], $result['legs']);
        $this->assertSame(5.0, $result['total_distance_ly']);
        $this->assertSame(3.0, $result['straight_line_distance_ly']);
        $this->assertSame(2.0, $result['potential_saving_ly']);
        $navigation = helm(NavigationService::class);
        $this->assertTrue($navigation->validateRouteEdges($this->origin, $this->target, $navigation->getRouteEdges($this->owner, $result['route'])));
    }

    public function test_direct_route_through_rest(): void
    {
        $edge = $this->connect($this->target, $this->origin, 3);
        $request = new WP_REST_Request('GET', '/wp-abilities/v1/abilities/helm/plan-route/run');
        $request->set_param('input', $this->input());
        $response = rest_do_request($request);
        $this->assertSame(200, $response->get_status());
        $result = $response->get_data();
        $this->assertTrue($result['direct']);
        $this->assertSame([$edge], $result['route']);
        $this->assertEquals(0, $result['potential_saving_ly']);
    }

    public function test_unreachable_and_same_node_have_distinct_results(): void
    {
        $this->connect($this->origin, $this->target, 3, $this->other);
        $ability = wp_get_ability('helm/plan-route');
        $result = $ability->execute($this->input());
        $this->assertFalse($result['reachable']);
        $this->assertNull($result['total_distance_ly']);
        $this->assertNull($result['potential_saving_ly']);
        $this->assertSame([], $result['route']);
        $this->assertSame([], $result['legs']);
        $result = $ability->execute(['ship_id' => $this->ship, 'target_node_id' => $this->origin]);
        $this->assertTrue($result['reachable']);
        $this->assertTrue($result['already_at_target']);
        $this->assertSame([$this->origin], $result['node_ids']);
        $this->assertSame([], $result['route']);
        $this->assertSame(0.0, $result['total_distance_ly']);
        $this->assertSame(0.0, $result['potential_saving_ly']);
    }

    public function test_rejects_invalid_input_and_unowned_ships_even_for_admins(): void
    {
        $this->setExpectedIncorrectUsage('WP_Ability::execute');
        $ability = wp_get_ability('helm/plan-route');
        foreach ([[], ['ship_id' => $this->ship, 'target_node_id' => 0], $this->input() + ['extra' => 1]] as $input) {
            $this->assertWPError($ability->execute($input));
        }
        foreach ([0, $this->other] as $user) {
            wp_set_current_user($user);
            $this->assertWPError($ability->execute($this->input()));
        }
    }

    public function test_missing_position_and_unknown_target_return_enum_errors(): void
    {
        $ability = wp_get_ability('helm/plan-route');
        $error = $ability->execute(['ship_id' => $this->ship, 'target_node_id' => 999999999]);
        $this->assertTrue(ErrorCode::NavigationInvalidTarget->matches($error));
        helm(ShipStateRepository::class)->updateNodeId($this->ship, null);
        $this->assertTrue(ErrorCode::ShipNoPosition->matches($ability->execute($this->input())));
    }

    public function test_search_limit_is_forwarded_without_claiming_unreachable(): void
    {
        $error = ErrorCode::NavigationSearchLimit->error('Search incomplete.', ['max_expansions' => 1000]);
        $navigation = $this->createMock(NavigationService::class);
        $navigation->expects($this->once())->method('findKnownPath')->with($this->owner, $this->origin, $this->target)->willReturn($error);
        $navigation->expects($this->never())->method('getRouteEdges');
        $ability = new PlanRoute(helm(ShipFactory::class), $navigation, helm(ShipActionsController::class));
        $this->assertSame($error, $ability->execute($this->input()));
    }
}
