<?php

declare(strict_types=1);

namespace Helm\Generation\Generated;

/**
 * Generated anomaly value object.
 *
 * Anomalies are special discoveries that provide unique rewards.
 */
final class Anomaly
{
    public const TYPE_DERELICT = 'derelict';
    public const TYPE_SIGNAL = 'signal';
    public const TYPE_ARTIFACT = 'artifact';
    public const TYPE_PHENOMENON = 'phenomenon';
    public const TYPE_WRECKAGE = 'wreckage';

    public const REWARD_CREDITS = 'credits';
    public const REWARD_RESOURCES = 'resources';
    public const REWARD_TECHNOLOGY = 'technology';
    public const REWARD_DATA = 'data';
    public const REWARD_ARTIFACT = 'artifact';

    /**
     * @param string $id Unique identifier
     * @param string $type Anomaly type
     * @param string $description Brief description
     * @param float $locationAu Distance from star in AU
     * @param array{type: string, value: mixed} $reward Reward for investigating
     * @param int $difficulty Investigation difficulty (1-100)
     */
    public function __construct(
        public readonly string $id,
        public readonly string $type,
        public readonly string $description,
        public readonly float $locationAu,
        public readonly array $reward,
        public readonly int $difficulty = 50,
    ) {}

    /**
     * Create from array data.
     *
     * @param array{id: string, type: string, description: string, location_au: float, reward: array{type: string, value: mixed}, difficulty?: int} $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            type: $data['type'],
            description: $data['description'],
            locationAu: $data['location_au'],
            reward: $data['reward'],
            difficulty: $data['difficulty'] ?? 50,
        );
    }

    /**
     * Convert to array.
     *
     * @return array{id: string, type: string, description: string, location_au: float, reward: array{type: string, value: mixed}, difficulty: int}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'description' => $this->description,
            'location_au' => $this->locationAu,
            'reward' => $this->reward,
            'difficulty' => $this->difficulty,
        ];
    }
}
