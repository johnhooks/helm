<?php

declare(strict_types=1);

namespace Helm\Discovery;

/**
 * Discovery record value object.
 *
 * Records when a ship discovered a star system.
 */
final class Discovery
{
    public function __construct(
        public readonly int $id,
        public readonly string $starId,
        public readonly string $shipId,
        public readonly string $contentsHash,
        public readonly bool $isFirst,
        public readonly int $discoveredAt,
    ) {}

    /**
     * Create from database row.
     *
     * @param array{id: int, star_id: string, ship_id: string, contents_hash: string, is_first: int|bool, discovered_at: int} $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            id: (int) $row['id'],
            starId: $row['star_id'],
            shipId: $row['ship_id'],
            contentsHash: $row['contents_hash'],
            isFirst: (bool) $row['is_first'],
            discoveredAt: (int) $row['discovered_at'],
        );
    }

    /**
     * Convert to database row format.
     *
     * @return array{star_id: string, ship_id: string, contents_hash: string, is_first: int, discovered_at: int}
     */
    public function toRow(): array
    {
        return [
            'star_id' => $this->starId,
            'ship_id' => $this->shipId,
            'contents_hash' => $this->contentsHash,
            'is_first' => $this->isFirst ? 1 : 0,
            'discovered_at' => $this->discoveredAt,
        ];
    }
}
