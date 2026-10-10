<?php

declare(strict_types=1);

namespace Tests\Wpunit\Abilities\Player;

use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\Ships\ShipPost;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Abilities\Player\Jump
 * @property WpunitTester $tester
 */
class JumpTest extends WPTestCase
{
    private int $owner;
    private int $other;
    private int $origin;
    private int $target;
    private int $edge;
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
        $this->edge = helm(EdgeRepository::class)->create($this->origin, $this->target, 1.0)->id;
        helm(UserEdgeRepository::class)->upsert($this->owner, $this->edge);
        $this->ship = $this->tester->haveShip([
            'ownerId' => $this->owner, 'node_id' => $this->origin, 'core_life' => 1000.0,
        ]);
        wp_set_current_user($this->owner);
    }

    public function test_jump_is_scheduled_and_requires_discovered_edges(): void
    {
        $ability = wp_get_ability('helm/jump');
        $invalid = $this->jumpInput();
        $thirdStar = $this->tester->haveStar(['id' => 'ABILITY_OTHER', 'distanceLy' => 2.0]);
        $third = $this->tester->getNodeForStar($thirdStar)->id;
        $unknown = helm(EdgeRepository::class)->create($this->origin, $third, 2.0);
        $invalid['target_node_id'] = $third;
        $invalid['route'] = [$unknown->id];
        // An edge can exist globally without being discovered by this player.
        helm(UserEdgeRepository::class)->upsert($this->other, $unknown->id);
        $this->assertWPError($ability->execute($invalid));
        $action = $ability->execute($this->jumpInput());
        $this->assertIsArray($action);
        $this->assertSame('jump', $action['type']);
        $this->assertNotNull($action['deferred_until']);
        $this->assertSame($this->origin, helm(ShipStateRepository::class)->find($this->ship->postId())->node_id);
    }

    public function test_rejects_empty_route(): void
    {
        $this->assertWPError(wp_get_ability('helm/jump')->execute(array_replace($this->jumpInput(), ['route' => []])));
        $this->assertNull(helm(ShipStateRepository::class)->find($this->ship->postId())->current_action_id);
    }

    public function test_rejects_unauthorized_calls_without_side_effects(): void
    {
        $this->setExpectedIncorrectUsage('WP_Ability::execute');
        foreach ([0, $this->other] as $user) {
            wp_set_current_user($user);
            $this->assertWPError(wp_get_ability('helm/jump')->execute($this->jumpInput()));
        }
        $this->assertNull(helm(ShipStateRepository::class)->find($this->ship->postId())->current_action_id);
    }

    /** @return array<string, mixed> */
    private function jumpInput(): array
    {
        return [
            'ship_id' => $this->ship->postId(), 'from_node_id' => $this->origin,
            'target_node_id' => $this->target, 'route' => [$this->edge],
        ];
    }
}
