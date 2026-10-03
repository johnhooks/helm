<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\ScanRoute;

/**
 * Public discoveries collected by a route scan. Lifecycle lives on the action.
 *
 * @phpstan-type DiscoveryPhase array{from_node_id: int, target_node_id: int, discovered_node_id: int, discovered_edge_id: int}
 */
final class Result
{
    /**
     * @param list<int> $path
     * @param list<DiscoveryPhase> $phases
     * @param list<int> $discoveredEdgeIds
     * @param list<int> $discoveredNodeIds
     * @param array<string, mixed> $extra Existing public fields, including errors
     */
    public function __construct(
        /**
         * Origin followed by discovered nodes in route order.
         */
        public array $path = [],
        /**
         * Public connection facts for each discovery.
         */
        public array $phases = [],
        /**
         * Edges revealed to the ship owner.
         */
        public array $discoveredEdgeIds = [],
        /**
         * Nodes revealed by the scan.
         */
        public array $discoveredNodeIds = [],
        private readonly array $extra = [],
    ) {
    }

    /**
     * @param array<string, mixed> $result
     */
    public static function fromArray(array $result): self
    {
        /**
         * @var list<DiscoveryPhase> $phases
         */
        $phases = isset($result['phases']) && is_array($result['phases'])
            ? array_values($result['phases'])
            : [];
        return new self(
            path: self::ids($result['path'] ?? []),
            phases: $phases,
            discoveredEdgeIds: self::ids($result['discovered_edge_ids'] ?? []),
            discoveredNodeIds: self::ids($result['discovered_node_ids'] ?? []),
            extra: array_diff_key($result, array_flip(['path', 'phases', 'discovered_edge_ids', 'discovered_node_ids'])),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return array_merge($this->extra, [
            'path' => $this->path,
            'phases' => $this->phases,
            'discovered_edge_ids' => $this->discoveredEdgeIds,
            'discovered_node_ids' => $this->discoveredNodeIds,
        ]);
    }

    /**
     * @return list<int>
     */
    private static function ids(mixed $value): array
    {
        return is_array($value) ? array_values(array_map('intval', $value)) : [];
    }
}
