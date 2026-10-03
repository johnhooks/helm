<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\Jump;

/**
 * Command intent. Populate during initialization; do not change during execution.
 */
final class Params
{
    /**
     * @param list<int>|null $route
     */
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
         * Ordered edge IDs of the accepted route.
         */
        public readonly ?array $route = null,
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
            route: isset($params['route']) && is_array($params['route'])
                ? array_values(array_map('intval', $params['route']))
                : null,
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
            'route' => $this->route,
        ], static fn (mixed $value): bool => $value !== null);
    }
}
