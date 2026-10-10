<?php

declare(strict_types=1);

namespace Tests\Wpunit\Abilities\Player;

use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\Contracts\EdgeRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Abilities\Player\ListKnownEdges
 * @property WpunitTester $tester
 */
class ListKnownEdgesTest extends WPTestCase
{
    private int $owner;
    private int $other;
    private int $edge;

    public function set_up(): void
    {
        parent::set_up();
        $this->tester->haveOrigin();
        $this->owner = self::factory()->user->create(['role' => 'subscriber']);
        $this->other = self::factory()->user->create(['role' => 'subscriber']);
        $from = $this->tester->haveStar(['id' => 'ABILITY_FROM', 'distanceLy' => 0.0]);
        $origin = $this->tester->getNodeForStar($from)->id;
        $to = $this->tester->haveStar(['id' => 'ABILITY_TO', 'distanceLy' => 1.0]);
        $target = $this->tester->getNodeForStar($to)->id;
        $this->edge = helm(EdgeRepository::class)->create($origin, $target, 1.0)->id;
        helm(UserEdgeRepository::class)->upsert($this->owner, $this->edge);
        wp_set_current_user($this->owner);
    }

    public function test_does_not_expose_another_players_edges(): void
    {
        $ability = wp_get_ability('helm/list-known-edges');
        $result = $ability->execute([]);
        $this->assertSame([$this->edge], array_column($result['edges'], 'id'));
        wp_set_current_user($this->other);
        $result = $ability->execute([]);
        $this->assertSame([], $result['edges']);
        $this->assertSame(0, $result['total']);
    }

    public function test_rejects_unauthorized_calls_without_side_effects(): void
    {
        foreach ([0] as $user) {
            wp_set_current_user($user);
            $this->assertWPError(wp_get_ability('helm/list-known-edges')->execute([]));
        }
    }
}
