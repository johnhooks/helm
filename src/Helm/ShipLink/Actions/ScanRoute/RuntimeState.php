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
 *
 * @phpstan-type ScanCycle array{cycle_index: int, resolved_at: string, from_node_id: int, target_node_id: int, skill: float, efficiency: float, outcome: 'no_discovery'|'waypoint'|'target_reached'|'revisited_node', discovered_node_id?: int, discovered_edge_id?: int, continuation?: array{probability: float, roll: float, continues: bool}}
 */
final class RuntimeState
{
    /**
     * @param list<ScanCycle> $cycles
     */
    public function __construct(
        /**
         * One-based checkpoint index; remains at the final attempt after termination.
         */
        public readonly int $cycleIndex,
        /**
         * Seconds between scan checkpoints.
         */
        public readonly int $cycleSeconds,
        /**
         * Maximum number of attempts.
         */
        public readonly int $maxCycles,
        /**
         * Schedule anchor; late processing does not shift it.
         */
        public readonly DateTimeImmutable $startedAt,
        /**
         * Private history of resolved attempts, discoveries, and continuation rolls.
         */
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
     * @param ScanCycle $record
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
     * @return list<ScanCycle>
     */
    private static function cyclesFromArray(mixed $cycles): array
    {
        if (! is_array($cycles)) {
            return [];
        }

        $records = [];
        foreach ($cycles as $cycle) {
            if (is_array($cycle)) {
                /**
                 * @var ScanCycle $cycle
                 */
                $records[] = $cycle;
            }
        }

        return $records;
    }
}
