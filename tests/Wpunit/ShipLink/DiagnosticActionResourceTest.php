<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use DateTimeImmutable;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Resources\DiagnosticActionResource;
use lucatume\WPBrowser\TestCase\WPTestCase;

class DiagnosticActionResourceTest extends WPTestCase
{
    public function test_preserves_raw_state_and_result_without_interpreting_scan_rules(): void
    {
        $time = new DateTimeImmutable('2026-10-11T12:00:00+00:00');
        $action = new Action([
            'id' => 39,
            'ship_post_id' => 123,
            'type' => ActionType::ScanRoute,
            'status' => ActionStatus::Running,
            'params' => ['target_node_id' => 225],
            'result' => ['stop_reason' => 'unrecognized', 'path' => [1, 2]],
            'runtime_state' => ['incomplete_state' => ['work' => 0.5]],
            'processing_at' => $time,
            'deferred_until' => $time,
            'attempts' => 2,
            'created_at' => $time,
            'updated_at' => $time,
        ]);

        $data = (new DiagnosticActionResource($action))->resolve();
        $this->assertSame([
            'id' => 39,
            'ship_post_id' => 123,
            'type' => 'scan_route',
            'status' => 'running',
            'params' => $action->params,
            'result' => $action->result,
            'runtime_state' => $action->runtime_state,
            'deferred_until' => '2026-10-11T12:00:00+00:00',
            'processing_at' => '2026-10-11T12:00:00+00:00',
            'attempts' => 2,
            'created_at' => '2026-10-11T12:00:00+00:00',
            'updated_at' => '2026-10-11T12:00:00+00:00',
        ], $data);
        $this->assertSame($data, json_decode(json_encode($data, JSON_THROW_ON_ERROR), true, 512, JSON_THROW_ON_ERROR));
    }

    public function test_preserves_null_state_result_and_checkpoints(): void
    {
        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
            'created_at' => new DateTimeImmutable(),
            'updated_at' => new DateTimeImmutable(),
        ]);

        $data = (new DiagnosticActionResource($action))->resolve();
        foreach (['result', 'runtime_state', 'processing_at', 'deferred_until'] as $field) {
            $this->assertArrayHasKey($field, $data);
            $this->assertNull($data[$field]);
        }
        $this->assertSame(0, $data['attempts']);
    }
}
