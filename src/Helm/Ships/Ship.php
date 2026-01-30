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
     * Default values for new ships.
     */
    public const DEFAULT_FUEL = 100.0;
    public const DEFAULT_DRIVE_RANGE = 7.0;
    public const DEFAULT_NAV_SKILL = 0.5;
    public const DEFAULT_NAV_EFFICIENCY = 0.5;

    /**
     * @param string $id Unique identifier
     * @param string $name Ship name
     * @param string $location Current star ID (legacy, use nodeId)
     * @param int $nodeId Current navigation node ID
     * @param int $credits Available credits
     * @param float $fuel Current fuel reserves
     * @param float $driveRange Maximum jump distance in light years
     * @param float $navSkill Navigation skill (0.0-1.0)
     * @param float $navEfficiency Navigation efficiency (0.0-1.0)
     * @param array<string, int> $cargo Resource type => quantity
     * @param array<string> $artifacts Equipped artifact IDs
     * @param int $createdAt Timestamp of creation
     * @param int $updatedAt Timestamp of last update
     */
    public function __construct(
        public readonly string $id,
        public readonly string $name,
        public readonly string $location,
        public readonly int $nodeId = 0,
        public readonly int $credits = 10000,
        public readonly float $fuel = self::DEFAULT_FUEL,
        public readonly float $driveRange = self::DEFAULT_DRIVE_RANGE,
        public readonly float $navSkill = self::DEFAULT_NAV_SKILL,
        public readonly float $navEfficiency = self::DEFAULT_NAV_EFFICIENCY,
        public readonly array $cargo = [],
        public readonly array $artifacts = [],
        public readonly int $createdAt = 0,
        public readonly int $updatedAt = 0,
    ) {}

    /**
     * Create from database row.
     *
     * @param array<string, mixed> $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            id: $row['id'],
            name: $row['name'],
            location: $row['location'],
            nodeId: (int) ($row['node_id'] ?? 0),
            credits: (int) $row['credits'],
            fuel: (float) ($row['fuel'] ?? self::DEFAULT_FUEL),
            driveRange: (float) ($row['drive_range'] ?? self::DEFAULT_DRIVE_RANGE),
            navSkill: (float) ($row['nav_skill'] ?? self::DEFAULT_NAV_SKILL),
            navEfficiency: (float) ($row['nav_efficiency'] ?? self::DEFAULT_NAV_EFFICIENCY),
            cargo: self::decodeJson($row['cargo'] ?? null),
            artifacts: self::decodeJson($row['artifacts'] ?? null),
            createdAt: (int) $row['created_at'],
            updatedAt: (int) $row['updated_at'],
        );
    }

    /**
     * Convert to database row format.
     *
     * @return array<string, mixed>
     */
    public function toRow(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'location' => $this->location,
            'node_id' => $this->nodeId,
            'credits' => $this->credits,
            'fuel' => $this->fuel,
            'drive_range' => $this->driveRange,
            'nav_skill' => $this->navSkill,
            'nav_efficiency' => $this->navEfficiency,
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
            nodeId: $this->nodeId,
            credits: $this->credits,
            fuel: $this->fuel,
            driveRange: $this->driveRange,
            navSkill: $this->navSkill,
            navEfficiency: $this->navEfficiency,
            cargo: $this->cargo,
            artifacts: $this->artifacts,
            createdAt: $this->createdAt,
            updatedAt: time(),
        );
    }

    /**
     * Create a new ship with updated node ID.
     */
    public function withNodeId(int $nodeId): self
    {
        return new self(
            id: $this->id,
            name: $this->name,
            location: $this->location,
            nodeId: $nodeId,
            credits: $this->credits,
            fuel: $this->fuel,
            driveRange: $this->driveRange,
            navSkill: $this->navSkill,
            navEfficiency: $this->navEfficiency,
            cargo: $this->cargo,
            artifacts: $this->artifacts,
            createdAt: $this->createdAt,
            updatedAt: time(),
        );
    }

    /**
     * Create a new ship with updated fuel.
     */
    public function withFuel(float $fuel): self
    {
        return new self(
            id: $this->id,
            name: $this->name,
            location: $this->location,
            nodeId: $this->nodeId,
            credits: $this->credits,
            fuel: max(0.0, $fuel),
            driveRange: $this->driveRange,
            navSkill: $this->navSkill,
            navEfficiency: $this->navEfficiency,
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
            nodeId: $this->nodeId,
            credits: $credits,
            fuel: $this->fuel,
            driveRange: $this->driveRange,
            navSkill: $this->navSkill,
            navEfficiency: $this->navEfficiency,
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
            nodeId: $this->nodeId,
            credits: $this->credits,
            fuel: $this->fuel,
            driveRange: $this->driveRange,
            navSkill: $this->navSkill,
            navEfficiency: $this->navEfficiency,
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
