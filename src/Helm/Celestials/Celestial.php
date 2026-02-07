<?php

declare(strict_types=1);

namespace Helm\Celestials;

/**
 * A link between a navigation node and content (star, station, anomaly).
 *
 * This is the pivot record that connects nodes to their celestial contents.
 */
final class Celestial
{
    public function __construct(
        public readonly int $id,
        public readonly int $nodeId,
        public readonly CelestialType $type,
        public readonly int $contentId,
        public readonly ?string $createdAt = null,
    ) {
    }

    /**
     * Create from database row.
     *
     * @param array<string, mixed> $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            id: (int) $row['id'],
            nodeId: (int) $row['node_id'],
            type: CelestialType::from($row['content_type']),
            contentId: (int) $row['content_id'],
            createdAt: $row['created_at'] ?? null,
        );
    }

    /**
     * Convert to array for database insertion.
     *
     * @return array<string, mixed>
     */
    public function toRow(): array
    {
        return [
            'node_id' => $this->nodeId,
            'content_type' => $this->type->value,
            'content_id' => $this->contentId,
        ];
    }
}
