<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\ScanRoute;

/**
 * Typed representation of the route scan action's saved runtime state.
 */
final class RuntimeState
{
    public function __construct(
        /**
         * Cycle duration in seconds.
         */
        public readonly int $cycleSeconds = 0,
        /**
         * Power charged per cycle.
         */
        public readonly float $powerCost = 0.0,
        /**
         * Work added by a successful cycle.
         */
        public readonly float $workGain = 0.0,
        /**
         * Navigation skill captured at launch.
         */
        public readonly float $skill = 0.0,
        /**
         * Effective sensor range in light years at launch.
         */
        public readonly float $sensorRange = 0.0,
        /**
         * Sensor accuracy used to calculate useful-work probability.
         */
        public readonly float $sensorQuality = 0.0,
        /**
         * Server-calculated origin-to-target distance in light years.
         */
        public readonly float $initialDistance = 0.0,
        /**
         * Minimum achievable discovery probability required to continue.
         */
        public readonly float $minCeiling = 0.0,
        /**
         * Maximum cycles allowed for this action.
         */
        public readonly int $maxCycles = 0,
        /**
         * Navigation efficiency used to calculate the cycle duration.
         */
        public readonly float $navigationEfficiency = 0.5,
        /**
         * Sensor range before core output and power mode scaling.
         */
        public readonly float $baseSensorRange = 0.0,
        /**
         * Core output before power mode scaling.
         */
        public readonly float $coreOutput = 1.0,
        /**
         * Power mode committed to the currently scheduled cycle.
         */
        public readonly string $powerMode = 'normal',
        /**
         * Intensity selected for this action.
         */
        public readonly string $intensity = 'normal',
    ) {
    }

    /**
     * Cycles processed during this action.
     */
    public int $completed = 0;

    /**
     * Connections discovered along this scan, including resumed progress.
     */
    public int $depth = 0;

    /**
     * Useful work accumulated toward the next connection.
     */
    public float $work = 0.0;

    /**
     * Power consumed during this action.
     */
    public float $spent = 0.0;

    /**
     * Node being scanned from; initially the ship's origin.
     */
    public int $source = 0;

    /**
     * Work needed to reach the discovery chance ceiling for this connection.
     */
    public float $required = 1.0;

    /**
     * Distance from the current scan source to its target in light years.
     */
    public float $remainingDistance = 0.0;

    /**
     * Maximum discovery probability for the current connection, from zero to one.
     */
    public float $ceiling = 0.0;

    /**
     * Probability that a cycle adds useful work, from zero to one.
     */
    public float $workChance = 0.75;

    /**
     * Action start timestamp used to anchor cycle scheduling.
     */
    public string $startedAt = '';

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        $state = new self(
            cycleSeconds: (int) ($data['cycleSeconds'] ?? 0),
            powerCost: (float) ($data['powerCost'] ?? 0),
            workGain: (float) ($data['workGain'] ?? 0),
            skill: (float) ($data['skill'] ?? 0),
            sensorRange: (float) ($data['sensorRange'] ?? 0),
            sensorQuality: (float) ($data['sensorQuality'] ?? 0),
            initialDistance: (float) ($data['initialDistance'] ?? 0),
            minCeiling: (float) ($data['minCeiling'] ?? 0),
            maxCycles: (int) ($data['maxCycles'] ?? 0),
            navigationEfficiency: (float) ($data['navigationEfficiency'] ?? 0.5),
            baseSensorRange: (float) ($data['baseSensorRange'] ?? 0),
            coreOutput: (float) ($data['coreOutput'] ?? 1),
            powerMode: (string) ($data['powerMode'] ?? 'normal'),
            intensity: (string) ($data['intensity'] ?? 'normal'),
        );
        $state->completed = (int) ($data['completed'] ?? 0);
        $state->depth = (int) ($data['depth'] ?? 0);
        $state->spent = (float) ($data['spent'] ?? 0);
        $state->source = (int) ($data['source'] ?? 0);
        $state->work = (float) ($data['work'] ?? 0);
        $state->remainingDistance = (float) ($data['remainingDistance'] ?? 0);
        $state->required = (float) ($data['required'] ?? 0);
        $state->ceiling = (float) ($data['ceiling'] ?? 0);
        $state->workChance = (float) ($data['workChance'] ?? 0);
        $state->startedAt = (string) ($data['startedAt'] ?? '');
        return $state;
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return get_object_vars($this);
    }
}
