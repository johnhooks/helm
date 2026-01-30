<?php

declare(strict_types=1);

namespace Helm\Generation\Generated;

use Helm\Generation\AnomalyReward;
use Helm\Generation\AnomalyType;

/**
 * Generated anomaly value object.
 *
 * Anomalies are special discoveries that provide unique rewards.
 */
final class Anomaly
{
    /**
     * @param string $id Unique identifier
     * @param AnomalyType $type Anomaly type
     * @param string $description Brief description
     * @param float $locationAu Distance from star in AU
     * @param AnomalyReward $rewardType Type of reward for investigating
     * @param mixed $rewardValue Value of the reward
     * @param int $difficulty Investigation difficulty (1-100)
     */
    public function __construct(
        public readonly string $id,
        public readonly AnomalyType $type,
        public readonly string $description,
        public readonly float $locationAu,
        public readonly AnomalyReward $rewardType,
        public readonly mixed $rewardValue,
        public readonly int $difficulty = 50,
    ) {
    }

    /**
     * Create from array data.
     *
     * @param array{id: string, type: string, description: string, location_au: float, reward: array{type: string, value: mixed}, difficulty?: int} $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            type: AnomalyType::from($data['type']),
            description: $data['description'],
            locationAu: $data['location_au'],
            rewardType: AnomalyReward::from($data['reward']['type']),
            rewardValue: $data['reward']['value'],
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
            'type' => $this->type->value,
            'description' => $this->description,
            'location_au' => $this->locationAu,
            'reward' => [
                'type' => $this->rewardType->value,
                'value' => $this->rewardValue,
            ],
            'difficulty' => $this->difficulty,
        ];
    }
}
