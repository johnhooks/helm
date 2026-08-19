<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\ScanRoute;

use DateTimeImmutable;
use Helm\Lib\Date;

/**
 * Private runtime state and execution history for a route scan.
 *
 * Holds only anchors and history. Cycle outcomes are calculated at
 * checkpoint time against live ship state, never precomputed.
 * Retained after termination for debugging; action status controls execution.
 */
final class RuntimeState
{
    /**
     * @param list<array<string, mixed>> $cycles
     */
    public function __construct(
        public readonly int $cycleIndex,
        public readonly int $cycleSeconds,
        public readonly int $maxCycles,
        public readonly DateTimeImmutable $startedAt,
        public readonly array $cycles = [],
        /**
         * Last discovered node to scan from; null means the original origin.
         */
        public readonly ?int $currentNodeId = null,
        /**
         * Discovered hop count, independent of unsuccessful attempts.
         */
        public readonly int $depth = 0,
    ) {
    }

    public static function start(
        int $cycleSeconds,
        int $maxCycles,
        DateTimeImmutable $startedAt,
    ): self {
        return new self(
            cycleIndex: 1,
            cycleSeconds: max(1, $cycleSeconds),
            maxCycles: max(1, $maxCycles),
            startedAt: $startedAt,
        );
    }

    /**
     * @param array<string, mixed> $state
     */
    public static function fromArray(array $state): self
    {
        return new self(
            cycleIndex: max(1, (int) ($state['cycle_index'] ?? 1)),
            cycleSeconds: max(1, (int) ($state['cycle_seconds'] ?? 300)),
            maxCycles: max(1, (int) ($state['max_cycles'] ?? 50)),
            startedAt: isset($state['started_at']) && is_string($state['started_at'])
                ? Date::fromString($state['started_at'])
                : Date::now(),
            cycles: self::cyclesFromArray($state['cycles'] ?? []),
            currentNodeId: isset($state['current_node_id']) ? (int) $state['current_node_id'] : null,
            depth: max(0, (int) ($state['depth'] ?? 0)),
        );
    }

    /**
     * @param array<string, mixed> $record
     */
    public function withRecordedCycle(array $record): self
    {
        return new self(
            cycleIndex: $this->cycleIndex,
            cycleSeconds: $this->cycleSeconds,
            maxCycles: $this->maxCycles,
            startedAt: $this->startedAt,
            cycles: [...$this->cycles, $record],
            currentNodeId: $this->currentNodeId,
            depth: $this->depth,
        );
    }

    public function withDiscovery(int $nodeId): self
    {
        return new self(
            cycleIndex: $this->cycleIndex,
            cycleSeconds: $this->cycleSeconds,
            maxCycles: $this->maxCycles,
            startedAt: $this->startedAt,
            cycles: $this->cycles,
            currentNodeId: $nodeId,
            depth: $this->depth + 1,
        );
    }

    public function nextCycle(): self
    {
        return new self(
            cycleIndex: $this->cycleIndex + 1,
            cycleSeconds: $this->cycleSeconds,
            maxCycles: $this->maxCycles,
            startedAt: $this->startedAt,
            cycles: $this->cycles,
            currentNodeId: $this->currentNodeId,
            depth: $this->depth,
        );
    }

    /**
     * The due time for the current cycle, anchored to the scan start time
     * so late processing never stretches the schedule.
     */
    public function checkpointAt(): DateTimeImmutable
    {
        return Date::addSeconds($this->startedAt, $this->cycleSeconds * $this->cycleIndex);
    }

    public function hasExceededMaxCycles(): bool
    {
        return $this->cycleIndex > $this->maxCycles;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'cycle_index' => $this->cycleIndex,
            'cycle_seconds' => $this->cycleSeconds,
            'max_cycles' => $this->maxCycles,
            'started_at' => Date::toString($this->startedAt),
            'cycles' => $this->cycles,
            'current_node_id' => $this->currentNodeId,
            'depth' => $this->depth,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function cyclesFromArray(mixed $cycles): array
    {
        if (! is_array($cycles)) {
            return [];
        }

        $records = [];
        foreach ($cycles as $cycle) {
            if (is_array($cycle)) {
                $records[] = $cycle;
            }
        }

        return $records;
    }
}
