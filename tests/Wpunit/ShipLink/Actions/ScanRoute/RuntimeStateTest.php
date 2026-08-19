<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\ScanRoute;

use DateTimeImmutable;
use Helm\ShipLink\Actions\ScanRoute\RuntimeState;
use PHPUnit\Framework\TestCase;

class RuntimeStateTest extends TestCase
{
    public function test_cursor_and_hop_depth_survive_checkpoint_round_trips(): void
    {
        $initial = RuntimeState::start(300, 50, new DateTimeImmutable('2026-04-01 00:00:00 UTC'));
        $record = ['outcome' => 'waypoint', 'continuation' => ['probability' => 0.8, 'roll' => 0.1, 'continues' => true]];
        $state = RuntimeState::fromArray($initial->withDiscovery(12)->withRecordedCycle($record)->nextCycle()->toArray());
        $this->assertNull($initial->currentNodeId);
        $this->assertSame(12, $state->currentNodeId);
        $this->assertSame(1, $state->depth);
        $this->assertSame(2, $state->cycleIndex);
        $state = RuntimeState::fromArray($state->withRecordedCycle(['outcome' => 'no_discovery'])->nextCycle()->toArray());
        $this->assertSame(12, $state->currentNodeId);
        $this->assertSame(1, $state->depth);
        $this->assertSame(3, $state->cycleIndex);
        $this->assertSame('2026-04-01 00:15:00', $state->checkpointAt()->format('Y-m-d H:i:s'));
        $state = RuntimeState::fromArray($state->withDiscovery(15)->nextCycle()->toArray());
        $this->assertSame(15, $state->currentNodeId);
        $this->assertSame(2, $state->depth);
        $this->assertCount(2, $state->cycles);
        $this->assertSame($record, $state->cycles[0]);
    }

    public function test_pre_discovery_state_without_cursor_fields_remains_readable(): void
    {
        $state = RuntimeState::fromArray([
            'cycle_index' => 4,
            'cycle_seconds' => 300,
            'max_cycles' => 4,
            'started_at' => '2026-04-01 00:00:00',
            'cycles' => [],
        ]);
        $this->assertNull($state->currentNodeId);
        $this->assertSame(0, $state->depth);
        $this->assertFalse($state->hasExceededMaxCycles());
        $this->assertTrue($state->nextCycle()->hasExceededMaxCycles());
    }
}
