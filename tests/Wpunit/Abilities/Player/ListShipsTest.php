<?php

declare(strict_types=1);

namespace Tests\Wpunit\Abilities\Player;

use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\Ships\ShipPost;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Abilities\Player\ListShips
 * @property WpunitTester $tester
 */
class ListShipsTest extends WPTestCase
{
    private int $owner;
    private int $other;
    private int $origin;
    private ShipPost $ship;

    public function set_up(): void
    {
        parent::set_up();
        $this->tester->haveOrigin();
        $this->owner = self::factory()->user->create(['role' => 'subscriber']);
        $this->other = self::factory()->user->create(['role' => 'subscriber']);
        $from = $this->tester->haveStar(['id' => 'ABILITY_FROM', 'distanceLy' => 0.0]);
        $this->origin = $this->tester->getNodeForStar($from)->id;
        $this->ship = $this->tester->haveShip([
            'ownerId' => $this->owner, 'node_id' => $this->origin, 'core_life' => 1000.0,
        ]);
        wp_set_current_user($this->owner);
    }

    public function test_lists_only_owned_ships_with_pagination(): void
    {
        $this->tester->haveShip(['ownerId' => $this->other, 'node_id' => $this->origin]);
        $this->tester->haveShip(['ownerId' => $this->owner, 'node_id' => $this->origin]);
        $ability = wp_get_ability('helm/list-ships');
        $first = $ability->execute(['per_page' => 1]);
        $this->assertIsArray($first);
        $this->assertCount(1, $first['ships']);
        $this->assertSame($this->ship->postId(), $first['ships'][0]['ship_id']);
        $this->assertSame(2, $first['total']);
        $this->assertTrue($first['has_more']);
        $second = $ability->execute(['page' => 2, 'per_page' => 1]);
        $this->assertNotSame($first['ships'], $second['ships']);
        $this->assertFalse($second['has_more']);
    }

    public function test_rejects_unauthorized_calls_without_side_effects(): void
    {
        foreach ([0] as $user) {
            wp_set_current_user($user);
            $this->assertWPError(wp_get_ability('helm/list-ships')->execute([]));
        }
        $this->assertNull(helm(ShipStateRepository::class)->find($this->ship->postId())->current_action_id);
    }
}
