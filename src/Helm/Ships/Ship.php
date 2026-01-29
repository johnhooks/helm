<?php

declare(strict_types=1);

namespace Helm\Ships;

/**
 * Ship value object.
 *
 * Represents a player's ship in the game.
 */
final class Ship
{
    /**
     * @param string $id Unique identifier
     * @param string $name Ship name
     * @param string $location Current star ID
     * @param int $credits Available credits
     * @param array<string, int> $cargo Resource type => quantity
     * @param array<string> $artifacts Equipped artifact IDs
     * @param int $createdAt Timestamp of creation
     * @param int $updatedAt Timestamp of last update
     */
    public function __construct(
        public readonly string $id,
        public readonly string $name,
        public readonly string $location,
        public readonly int $credits = 10000,
        public readonly array $cargo = [],
        public readonly array $artifacts = [],
        public readonly int $createdAt = 0,
        public readonly int $updatedAt = 0,
    ) {}

    /**
     * Create from database row.
     *
     * @param array{id: string, name: string, location: string, credits: int, cargo: string|null, artifacts: string|null, created_at: int, updated_at: int} $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            id: $row['id'],
            name: $row['name'],
            location: $row['location'],
            credits: (int) $row['credits'],
            cargo: self::decodeJson($row['cargo'] ?? null),
            artifacts: self::decodeJson($row['artifacts'] ?? null),
            createdAt: (int) $row['created_at'],
            updatedAt: (int) $row['updated_at'],
        );
    }

    /**
     * Convert to database row format.
     *
     * @return array{id: string, name: string, location: string, credits: int, cargo: string, artifacts: string, created_at: int, updated_at: int}
     */
    public function toRow(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'location' => $this->location,
            'credits' => $this->credits,
            'cargo' => json_encode($this->cargo, JSON_THROW_ON_ERROR),
            'artifacts' => json_encode($this->artifacts, JSON_THROW_ON_ERROR),
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
        ];
    }

    /**
     * Get cargo quantity for a resource.
     */
    public function cargoQuantity(string $resource): int
    {
        return $this->cargo[$resource] ?? 0;
    }

    /**
     * Get total cargo weight.
     */
    public function totalCargo(): int
    {
        return array_sum($this->cargo);
    }

    /**
     * Check if ship has an artifact equipped.
     */
    public function hasArtifact(string $artifactId): bool
    {
        return in_array($artifactId, $this->artifacts, true);
    }

    /**
     * Create a new ship with updated location.
     */
    public function withLocation(string $location): self
    {
        return new self(
            id: $this->id,
            name: $this->name,
            location: $location,
            credits: $this->credits,
            cargo: $this->cargo,
            artifacts: $this->artifacts,
            createdAt: $this->createdAt,
            updatedAt: time(),
        );
    }

    /**
     * Create a new ship with updated credits.
     */
    public function withCredits(int $credits): self
    {
        return new self(
            id: $this->id,
            name: $this->name,
            location: $this->location,
            credits: $credits,
            cargo: $this->cargo,
            artifacts: $this->artifacts,
            createdAt: $this->createdAt,
            updatedAt: time(),
        );
    }

    /**
     * Create a new ship with updated cargo.
     *
     * @param array<string, int> $cargo
     */
    public function withCargo(array $cargo): self
    {
        return new self(
            id: $this->id,
            name: $this->name,
            location: $this->location,
            credits: $this->credits,
            cargo: $cargo,
            artifacts: $this->artifacts,
            createdAt: $this->createdAt,
            updatedAt: time(),
        );
    }

    /**
     * Decode JSON column.
     *
     * @return array<mixed>
     */
    private static function decodeJson(?string $json): array
    {
        if ($json === null || $json === '') {
            return [];
        }

        return json_decode($json, true, 512, JSON_THROW_ON_ERROR) ?? [];
    }
}
