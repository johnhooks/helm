<?php

declare(strict_types=1);

namespace Helm\Origin;

/**
 * Origin configuration value object.
 *
 * Immutable configuration for an Origin instance.
 */
final class OriginConfig
{
    public function __construct(
        public readonly string $id,
        public readonly string $masterSeed,
        public readonly int $knownSpaceThreshold = 3,
        public readonly int $createdAt = 0,
    ) {
        if ($this->createdAt === 0) {
            // This is a workaround since we can't use time() as default
            // The actual default is set in Origin::create()
        }
    }

    /**
     * Create config from database row.
     *
     * @param array{id: string, master_seed: string, known_space_threshold: int, created_at: int} $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            id: $row['id'],
            masterSeed: $row['master_seed'],
            knownSpaceThreshold: (int) $row['known_space_threshold'],
            createdAt: (int) $row['created_at'],
        );
    }

    /**
     * Convert to database row format.
     *
     * @return array{id: string, master_seed: string, known_space_threshold: int, created_at: int}
     */
    public function toRow(): array
    {
        return [
            'id' => $this->id,
            'master_seed' => $this->masterSeed,
            'known_space_threshold' => $this->knownSpaceThreshold,
            'created_at' => $this->createdAt,
        ];
    }
}
