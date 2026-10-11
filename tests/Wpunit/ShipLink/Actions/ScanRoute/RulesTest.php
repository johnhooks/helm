<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\ScanRoute;

use Helm\ShipLink\Actions\ScanRoute\Rules;
use Helm\ShipLink\Actions\ScanRoute\RuntimeState;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\ShipLink\Actions\ScanRoute\Rules
 */
class RulesTest extends WPTestCase
{
    public function test_discovery_chance_has_a_point_one_percent_floor_without_useful_work(): void
    {
        $rules = helm(Rules::class);
        $state = new RuntimeState(workGain: 0.5);
        $state->required = 72;
        $state->ceiling = 0.6;

        $this->assertSame(0.001, $rules->chanceAt($state, 0));
        $this->assertSame(0.001, $rules->chanceAt($state, 4));
        $this->assertEqualsWithDelta(0.001, $rules->nextChance($state), 1e-12);
        $this->assertEqualsWithDelta(0.001, $rules->progress($state, false)['discovery_chance'], 1e-12);
        $this->assertNull($rules->progress($state, true)['discovery_chance']);
    }

    public function test_work_still_increases_chance_up_to_the_connection_ceiling(): void
    {
        $rules = helm(Rules::class);
        $state = new RuntimeState();
        $state->required = 100;
        $state->ceiling = 0.6;

        $this->assertEqualsWithDelta(0.6 * 0.9 ** 12, $rules->chanceAt($state, 90), 1e-12);
        $this->assertSame(0.6, $rules->chanceAt($state, 100));
        $this->assertSame(0.6, $rules->chanceAt($state, 200));

        $state->ceiling *= 0.65;
        $this->assertSame(0.001, $rules->chanceAt($state, 0));
        $this->assertSame(0.39, $rules->chanceAt($state, 100));
    }
}
