<?php

declare(strict_types=1);

namespace Helm\Generation\Generated;

use Helm\Generation\AsteroidBeltType;

/**
 * Generated asteroid belt value object.
 */
final class AsteroidBelt
{
    /**
     * @param string $id Unique identifier
     * @param AsteroidBeltType $type Belt composition type
     * @param float $innerAu Inner edge distance in AU
     * @param float $outerAu Outer edge distance in AU
     * @param int $density Relative density (1-100)
     * @param array<string, int> $resources Resource type => richness (1-100)
     */
    public function __construct(
        public readonly string $id,
        public readonly AsteroidBeltType $type,
        public readonly float $innerAu,
        public readonly float $outerAu,
        public readonly int $density = 50,
        public readonly array $resources = [],
    ) {
    }

    /**
     * Create from array data.
     *
     * @param array{id: string, type: string, inner_au: float, outer_au: float, density?: int, resources?: array<string, int>} $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            type: AsteroidBeltType::from($data['type']),
            innerAu: $data['inner_au'],
            outerAu: $data['outer_au'],
            density: $data['density'] ?? 50,
            resources: $data['resources'] ?? [],
        );
    }

    /**
     * Convert to array.
     *
     * @return array{id: string, type: string, inner_au: float, outer_au: float, density: int, resources: array<string, int>}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'inner_au' => $this->innerAu,
            'outer_au' => $this->outerAu,
            'density' => $this->density,
            'resources' => $this->resources,
        ];
    }
}
