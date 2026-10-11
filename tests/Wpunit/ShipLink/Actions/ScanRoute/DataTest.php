<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\ScanRoute;

use Helm\ShipLink\Actions\ScanRoute\Params;
use Helm\ShipLink\Actions\ScanRoute\Result;
use Helm\ShipLink\Actions\ScanRoute\RuntimeState;
use lucatume\WPBrowser\TestCase\WPTestCase;

class DataTest extends WPTestCase
{
    public function test_params_preserve_distinct_client_and_server_origins(): void
    {
        $params = Params::fromArray([
            'target_node_id' => '9',
            'from_node_id' => '2',
            'source_node_id' => '1',
            'distance_ly' => '0',
            'intensity' => 'fast',
        ]);
        $this->assertSame(2, $params->fromNodeId);
        $this->assertSame(1, $params->sourceNodeId);
        $this->assertSame(9, $params->targetNodeId);
        $this->assertSame(0.0, $params->distanceLy);
        $this->assertSame('fast', $params->intensity);
        $this->assertSame($params->toArray(), Params::fromArray($params->toArray())->toArray());
    }

    public function test_draft_params_do_not_invent_server_context(): void
    {
        $params = Params::fromArray(['target_node_id' => 9]);
        $this->assertNull($params->fromNodeId);
        $this->assertNull($params->sourceNodeId);
        $this->assertNull($params->distanceLy);
        $this->assertSame(['target_node_id' => 9], $params->toArray());
    }

    public function test_empty_discovery_result_keeps_origin_and_empty_collections(): void
    {
        $result = new Result(path: [1]);
        $expected = [
            'path' => [1],
            'phases' => [],
            'discovered_edge_ids' => [],
            'discovered_node_ids' => [],
        ];
        $this->assertSame($expected, $result->toArray());
        $this->assertSame($expected, Result::fromArray($expected)->toArray());
    }

    public function test_discovery_result_round_trip_preserves_path_order_and_error(): void
    {
        $stored = [
            'path' => [1, 3],
            'phases' => [[
                'from_node_id' => 1,
                'target_node_id' => 9,
                'discovered_node_id' => 3,
                'discovered_edge_id' => 12,
            ]],
            'discovered_edge_ids' => [12],
            'discovered_node_ids' => [3],
            'error' => ['code' => 'interrupted'],
        ];
        $result = Result::fromArray($stored);
        $this->assertSame([1, 3], $result->path);
        $this->assertSame($stored['phases'], $result->phases);
        $this->assertEquals($stored, $result->toArray());
    }

    public function test_runtime_round_trip_preserves_progress(): void
    {
        $state = new RuntimeState();
        $state->startedAt = '2026-10-02 12:00:00';
        $state->completed = 3;
        $state->work = 2.5;
        $state->depth = 1;
        $state->source = 3;
        $state->spent = 6;
        $stored = json_decode(wp_json_encode($state->toArray()), true);
        $this->assertSame($state->toArray(), RuntimeState::fromArray($stored)->toArray());
    }
    public function test_operating_values_round_trip_through_runtime_state(): void
    {
        $operatingValues = [
            'cycleSeconds' => 300,
            'powerCost' => 2.0,
            'workGain' => 1.0,
            'skill' => 0.6,
            'sensorRange' => 5.0,
            'sensorQuality' => 0.8,
            'initialDistance' => 2.0,
            'minCeiling' => 0.12,
            'maxCycles' => 720,
        ];
        $state = RuntimeState::fromArray($operatingValues);
        $stored = json_decode(wp_json_encode($state->toArray()), true);
        $this->assertSame($state->toArray(), RuntimeState::fromArray($stored)->toArray());
        $this->assertSame($operatingValues, array_intersect_key($state->toArray(), $operatingValues));
    }
}
