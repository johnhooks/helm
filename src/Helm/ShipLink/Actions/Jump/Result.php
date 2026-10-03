<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\Jump;

/**
 * Public jump progress, retained when the action finishes.
 *
 * @phpstan-type JumpPhase array{core_cost: float, core_before: int, remaining_core_life: int, completed_at: string}
 */
final class Result
{
    /**
     * @param list<JumpPhase>|null $phases
     * @param array<string, mixed> $extra Existing public fields, including errors
     */
    public function __construct(
        /**
         * Completed legs in route order. Null before any progress is recorded.
         */
        public ?array $phases = null,
        /**
         * Last node reached.
         */
        public ?int $currentNodeId = null,
        /**
         * Core life after the latest completed leg.
         */
        public ?int $remainingCoreLife = null,
        /**
         * Core life before the latest completed leg, not the whole route.
         */
        public ?int $coreBefore = null,
        private readonly array $extra = [],
    ) {
    }

    /**
     * @param array<string, mixed> $result
     */
    public static function fromArray(array $result): self
    {
        /**
         * @var list<JumpPhase>|null $phases
         */
        $phases = isset($result['phases']) && is_array($result['phases'])
            ? array_values($result['phases'])
            : null;
        return new self(
            phases: $phases,
            currentNodeId: isset($result['current_node_id']) ? (int) $result['current_node_id'] : null,
            remainingCoreLife: isset($result['remaining_core_life']) ? (int) $result['remaining_core_life'] : null,
            coreBefore: isset($result['core_before']) ? (int) $result['core_before'] : null,
            extra: array_diff_key($result, array_flip(['phases', 'current_node_id', 'remaining_core_life', 'core_before'])),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return array_merge($this->extra, array_filter([
            'phases' => $this->phases,
            'current_node_id' => $this->currentNodeId,
            'remaining_core_life' => $this->remainingCoreLife,
            'core_before' => $this->coreBefore,
        ], static fn (mixed $value): bool => $value !== null));
    }
}
