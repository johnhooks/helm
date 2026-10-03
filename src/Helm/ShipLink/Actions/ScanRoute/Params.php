<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\ScanRoute;

/**
 * Command intent. Populate during initialization; do not change during execution.
 */
final class Params
{
    public function __construct(
        /**
         * Origin captured when the action is initialized.
         */
        public readonly ?int $fromNodeId = null,
        /**
         * Requested destination, fixed for the action lifetime.
         */
        public readonly ?int $targetNodeId = null,
        /**
         * Client-supplied origin; fromNodeId is the authoritative origin.
         */
        public readonly ?int $sourceNodeId = null,
        /**
         * Client-supplied target distance in light years.
         */
        public readonly ?float $distanceLy = null,
    ) {
    }

    /**
     * @param array<string, mixed> $params
     */
    public static function fromArray(array $params): self
    {
        return new self(
            fromNodeId: isset($params['from_node_id']) ? (int) $params['from_node_id'] : null,
            targetNodeId: isset($params['target_node_id']) ? (int) $params['target_node_id'] : null,
            sourceNodeId: isset($params['source_node_id']) ? (int) $params['source_node_id'] : null,
            distanceLy: isset($params['distance_ly']) ? (float) $params['distance_ly'] : null,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return array_filter([
            'from_node_id' => $this->fromNodeId,
            'target_node_id' => $this->targetNodeId,
            'source_node_id' => $this->sourceNodeId,
            'distance_ly' => $this->distanceLy,
        ], static fn (mixed $value): bool => $value !== null);
    }
}
