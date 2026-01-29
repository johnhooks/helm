<?php

declare(strict_types=1);

namespace Tests\Wpunit\Origin;

use Helm\Origin\SeededRandom;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\Origin\SeededRandom
 */
class SeededRandomTest extends WPTestCase
{
    public function test_same_seed_produces_same_sequence(): void
    {
        $seed = 'test-seed-123';

        $rng1 = new SeededRandom($seed);
        $rng2 = new SeededRandom($seed);

        // Generate a sequence of numbers
        $sequence1 = [];
        $sequence2 = [];

        for ($i = 0; $i < 10; $i++) {
            $sequence1[] = $rng1->between(1, 1000);
            $sequence2[] = $rng2->between(1, 1000);
        }

        $this->assertSame($sequence1, $sequence2);
    }

    public function test_different_seeds_produce_different_sequences(): void
    {
        $rng1 = new SeededRandom('seed-a');
        $rng2 = new SeededRandom('seed-b');

        $sequence1 = [];
        $sequence2 = [];

        for ($i = 0; $i < 10; $i++) {
            $sequence1[] = $rng1->between(1, 1000);
            $sequence2[] = $rng2->between(1, 1000);
        }

        $this->assertNotSame($sequence1, $sequence2);
    }

    public function test_between_respects_bounds(): void
    {
        $rng = new SeededRandom('bounds-test');

        for ($i = 0; $i < 100; $i++) {
            $value = $rng->between(10, 20);
            $this->assertGreaterThanOrEqual(10, $value);
            $this->assertLessThanOrEqual(20, $value);
        }
    }

    public function test_chance_returns_boolean(): void
    {
        $rng = new SeededRandom('chance-test');

        // Run many iterations to check both outcomes can occur
        $trueCount = 0;
        $falseCount = 0;

        for ($i = 0; $i < 100; $i++) {
            if ($rng->chance(500)) { // 50%
                $trueCount++;
            } else {
                $falseCount++;
            }
        }

        // With 50% chance, both should be non-zero
        $this->assertGreaterThan(0, $trueCount);
        $this->assertGreaterThan(0, $falseCount);
    }

    public function test_chance_zero_always_false(): void
    {
        $rng = new SeededRandom('zero-chance');

        for ($i = 0; $i < 10; $i++) {
            $this->assertFalse($rng->chance(0));
        }
    }

    public function test_chance_thousand_always_true(): void
    {
        $rng = new SeededRandom('full-chance');

        for ($i = 0; $i < 10; $i++) {
            $this->assertTrue($rng->chance(1000));
        }
    }

    public function test_pick_returns_item_from_array(): void
    {
        $rng = new SeededRandom('pick-test');
        $items = ['apple', 'banana', 'cherry'];

        for ($i = 0; $i < 20; $i++) {
            $picked = $rng->pick($items);
            $this->assertContains($picked, $items);
        }
    }

    public function test_pick_throws_on_empty_array(): void
    {
        $rng = new SeededRandom('empty-pick');

        $this->expectException(\InvalidArgumentException::class);
        $rng->pick([]);
    }

    public function test_pick_weighted_respects_weights(): void
    {
        $rng = new SeededRandom('weighted-test');

        // Heavily weighted toward 'common'
        $items = [
            'common' => 900,
            'rare' => 100,
        ];

        $counts = ['common' => 0, 'rare' => 0];

        for ($i = 0; $i < 100; $i++) {
            $picked = $rng->pickWeighted($items);
            $counts[$picked]++;
        }

        // Common should appear much more often
        $this->assertGreaterThan($counts['rare'], $counts['common']);
    }

    public function test_shuffle_returns_same_items(): void
    {
        $rng = new SeededRandom('shuffle-test');
        $items = ['a', 'b', 'c', 'd', 'e'];

        $shuffled = $rng->shuffle($items);

        $this->assertCount(count($items), $shuffled);
        foreach ($items as $item) {
            $this->assertContains($item, $shuffled);
        }
    }

    public function test_shuffle_is_deterministic(): void
    {
        $items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

        $rng1 = new SeededRandom('shuffle-deterministic');
        $rng2 = new SeededRandom('shuffle-deterministic');

        $shuffled1 = $rng1->shuffle($items);
        $shuffled2 = $rng2->shuffle($items);

        $this->assertSame($shuffled1, $shuffled2);
    }

    public function test_get_state_returns_consistent_initial_value(): void
    {
        $rng1 = new SeededRandom('consistent');
        $rng2 = new SeededRandom('consistent');

        // Initial state should be the same
        $this->assertSame($rng1->getState(), $rng2->getState());
    }
}
