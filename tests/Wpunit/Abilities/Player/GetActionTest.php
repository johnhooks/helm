<?php

declare(strict_types=1);

namespace Tests\Wpunit\Abilities\Player;

use Helm\Ships\ShipPost;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Abilities\Player\GetAction
 * @property WpunitTester $tester
 */
class GetActionTest extends WPTestCase
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

    public function test_reads_public_action_and_rejects_other_players(): void
    {
        $this->setExpectedIncorrectUsage('WP_Ability::execute');
        $action = wp_get_ability('helm/scan-route')->execute(['ship_id' => $this->ship->postId(), 'target_node_id' => $this->target]);
        $read = wp_get_ability('helm/get-action');
        $this->assertSame($action, $read->execute(['action_id' => $action['id']]));
        wp_set_current_user($this->other);
        $this->assertWPError($read->execute(['action_id' => $action['id']]));
        wp_set_current_user(0);
        $this->assertWPError($read->execute(['action_id' => $action['id']]));
    }
}
