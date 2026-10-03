<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\Jump;

use Helm\ShipLink\Actions\Jump\Params;
use Helm\ShipLink\Actions\Jump\Result;
use lucatume\WPBrowser\TestCase\WPTestCase;

class DataTest extends WPTestCase
{
    public function test_params_normalize_ids_and_keep_route_order(): void
    {
        $params = Params::fromArray([
            'from_node_id' => '1',
            'target_node_id' => '3',
            'route' => [5 => '12', 8 => '11'],
        ]);

        $this->assertSame([
            'from_node_id' => 1,
            'target_node_id' => 3,
            'route' => [12, 11],
        ], $params->toArray());
    }

    public function test_missing_or_invalid_route_remains_distinguishable_from_empty_route(): void
    {
        $this->assertNull(Params::fromArray([])->route);
        $this->assertNull(Params::fromArray(['route' => 'invalid'])->route);
        $this->assertSame([], Params::fromArray(['route' => []])->route);
        $this->assertSame([], Params::fromArray([])->toArray());
    }

    public function test_empty_result_does_not_invent_progress(): void
    {
        $result = Result::fromArray([]);

        $this->assertNull($result->phases);
        $this->assertNull($result->currentNodeId);
        $this->assertSame([], $result->toArray());
    }

    public function test_progress_updates_preserve_prior_legs_and_public_errors(): void
    {
        $first = [
            'core_cost' => 2.5,
            'core_before' => 6,
            'remaining_core_life' => 3,
            'completed_at' => '2026-10-02 12:00:00',
        ];
        $error = ['code' => 'interrupted', 'message' => 'Route interrupted'];
        $result = Result::fromArray([
            'phases' => [$first],
            'current_node_id' => 2,
            'remaining_core_life' => 3,
            'core_before' => 6,
            'error' => $error,
        ]);
        $second = [...$first, 'core_before' => 3, 'remaining_core_life' => 0];
        $result->phases[] = $second;
        $result->currentNodeId = 3;
        $result->coreBefore = 3;
        $result->remainingCoreLife = 0;

        $stored = $result->toArray();
        $this->assertSame([$first, $second], $stored['phases']);
        $this->assertSame(0, $stored['remaining_core_life']);
        $this->assertSame(3, $stored['core_before']);
        $this->assertSame(3, $stored['current_node_id']);
        $this->assertSame($error, $stored['error']);
        $this->assertSame($stored, Result::fromArray($stored)->toArray());
    }
}
