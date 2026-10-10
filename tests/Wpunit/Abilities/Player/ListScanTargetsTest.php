<?php

declare(strict_types=1);

namespace Tests\Wpunit\Abilities\Player;

use Helm\Abilities\Player\ListScanTargets;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\NavigationService;
use Helm\Rest\ShipActionsController;
use Helm\ShipLink\ShipFactory;
use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\Ships\ShipPost;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Abilities\Player\ListScanTargets
 * @property WpunitTester $tester
 */
class ListScanTargetsTest extends WPTestCase
{
    private int $owner;
    private int $other;
    private int $origin;
    private int $target;
    private ShipPost $ship;

    public function set_up(): void
    {
        parent::set_up();
        $this->tester->haveOrigin();
        $this->owner = self::factory()->user->create(['role' => 'subscriber']);
        $this->other = self::factory()->user->create(['role' => 'subscriber']);
        $from = $this->tester->haveStar(['id' => 'ABILITY_FROM', 'distanceLy' => 0.0]);
        $this->origin = $this->tester->getNodeForStar($from)->id;
        $to = $this->tester->haveStar(['id' => 'ABILITY_TO', 'distanceLy' => 1.0]);
        $this->target = $this->tester->getNodeForStar($to)->id;
        $this->ship = $this->tester->haveShip([
            'ownerId' => $this->owner, 'node_id' => $this->origin, 'core_life' => 1000.0,
        ]);
        wp_set_current_user($this->owner);
    }

    public function test_lists_nearby_targets_without_global_discoveries(): void
    {
        $input = ['ship_id' => $this->ship->postId()];
        $targets = wp_get_ability('helm/list-scan-targets')->execute($input);
        $this->assertIsArray($targets);
        $this->assertContains($this->target, array_column($targets['targets'], 'node_id'));
        foreach ($targets['targets'] as $target) {
            $this->assertArrayNotHasKey('has_route', $target);
            $this->assertFalse($target['has_discovered_route']);
            $this->assertFalse($target['has_any_discovered_route']);
        }
    }

    public function test_flags_only_the_players_direct_discoveries(): void
    {
        $edges = helm(EdgeRepository::class);
        $discoveries = helm(UserEdgeRepository::class);
        $direct = $edges->create($this->origin, $this->target, 1.0);
        $discoveries->upsert($this->other, $direct->id);
        $ability = wp_get_ability('helm/list-scan-targets');
        $input = ['ship_id' => $this->ship->postId()];
        $result = $ability->execute($input);
        $flags = array_column($result['targets'], 'has_discovered_route', 'node_id');
        $this->assertFalse($flags[$this->target]);

        $third = $this->tester->haveStar(['id' => 'ABILITY_INDIRECT', 'distanceLy' => 2.0]);
        $thirdId = $this->tester->getNodeForStar($third)->id;
        $via = $edges->create($this->target, $thirdId, 1.0);
        $discoveries->upsert($this->owner, $direct->id);
        $discoveries->upsert($this->owner, $via->id);
        $result = $ability->execute($input);
        $flags = array_column($result['targets'], 'has_discovered_route', 'node_id');
        $this->assertTrue($flags[$this->target]);
        $this->assertFalse($flags[$thirdId]);
        $this->assertSame(2, $result['total']);
    }

    public function test_any_discovery_includes_disconnected_edges_but_not_other_players(): void
    {
        $third = $this->tester->haveStar(['id' => 'ABILITY_DISCONNECTED', 'distanceLy' => 2.0]);
        $thirdId = $this->tester->getNodeForStar($third)->id;
        $edge = helm(EdgeRepository::class)->create($this->target, $thirdId, 1.0);
        $discoveries = helm(UserEdgeRepository::class);
        $discoveries->upsert($this->other, $edge->id);
        $ability = wp_get_ability('helm/list-scan-targets');
        $input = ['ship_id' => $this->ship->postId()];
        foreach ($ability->execute($input)['targets'] as $target) {
            $this->assertFalse($target['has_any_discovered_route']);
        }
        $discoveries->upsert($this->owner, $edge->id);
        $result = $ability->execute($input);
        $this->assertCount(2, $result['targets']);
        foreach ($result['targets'] as $target) {
            $this->assertTrue($target['has_any_discovered_route']);
            $this->assertFalse($target['has_discovered_route']);
        }
    }

    public function test_queries_only_current_page_targets_once_and_skips_empty_pages(): void
    {
        $third = $this->tester->haveStar(['id' => 'ABILITY_PAGE_TWO', 'distanceLy' => 2.0]);
        $thirdId = $this->tester->getNodeForStar($third)->id;
        $edges = $this->createMock(UserEdgeRepository::class);
        $edges->expects($this->once())->method('discoveredTargets')
            ->with($this->owner, $this->origin, [$thirdId])->willReturn([$thirdId]);
        $edges->expects($this->once())->method('nodesWithDiscoveredEdges')
            ->with($this->owner, [$thirdId])->willReturn([$thirdId]);
        $edges->expects($this->never())->method('paginate');
        $edges->expects($this->never())->method('getMany');
        $ability = new ListScanTargets(
            helm(ShipFactory::class),
            helm(NavigationService::class),
            $edges,
            helm(ShipActionsController::class)
        );
        $input = ['ship_id' => $this->ship->postId(), 'per_page' => 1, 'page' => 2];
        $result = $ability->execute($input);
        $this->assertSame([$thirdId], array_column($result['targets'], 'node_id'));
        $this->assertTrue($result['targets'][0]['has_discovered_route']);
        $this->assertTrue($result['targets'][0]['has_any_discovered_route']);
        $this->assertFalse($result['has_more']);
        $this->assertSame(2, $result['total']);
        $input['page'] = 3;
        $empty = $ability->execute($input);
        $this->assertSame([], $empty['targets']);
        $this->assertSame(2, $empty['total']);
    }

    public function test_rejects_unauthorized_calls_without_side_effects(): void
    {
        $this->setExpectedIncorrectUsage('WP_Ability::execute');
        foreach ([0, $this->other] as $user) {
            wp_set_current_user($user);
            $this->assertWPError(wp_get_ability('helm/list-scan-targets')->execute(['ship_id' => $this->ship->postId()]));
        }
        $this->assertNull(helm(ShipStateRepository::class)->find($this->ship->postId())->current_action_id);
    }
}
