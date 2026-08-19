<?php

declare(strict_types=1);

namespace Tests\Wpunit\Simulation;

use Helm\Simulation\SimulationRandomSource;
use lucatume\WPBrowser\TestCase\WPTestCase;

class SimulationRandomSourceTest extends WPTestCase
{
    public function test_seeded_sequences_repeat_without_sharing_state(): void
    {
        $first = new SimulationRandomSource('exploration');
        $second = new SimulationRandomSource('exploration');
        $other = new SimulationRandomSource('other');
        $values = [];
        for ($index = 0; $index < 10; $index++) {
            $values[] = $first->next();
        }
        foreach ($values as $value) {
            $this->assertSame($value, $second->next());
            $this->assertGreaterThanOrEqual(0.0, $value);
            $this->assertLessThanOrEqual(1.0, $value);
        }
        $this->assertNotSame($values[0], $other->next());
    }

    public function test_scripted_rolls_are_consumed_before_the_seeded_sequence(): void
    {
        $source = new SimulationRandomSource('exploration');
        $control = new SimulationRandomSource('exploration');
        $source->setRolls([0.0, 1.0, 0.5]);
        $this->assertSame(0.0, $source->next());
        $this->assertSame(1.0, $source->next());
        $this->assertSame(0.5, $source->next());
        $this->assertSame($control->next(), $source->next());
        $source->setRolls([0.25]);
        $this->assertSame(0.25, $source->next());
    }

    public function test_invalid_roll_does_not_replace_the_existing_script(): void
    {
        $source = new SimulationRandomSource();
        $source->setRolls([0.5]);
        try {
            $source->setRolls([1.1]);
            $this->fail('Out-of-range rolls must be rejected');
        } catch (\InvalidArgumentException) {
            $this->assertSame(0.5, $source->next());
        }
    }
}
