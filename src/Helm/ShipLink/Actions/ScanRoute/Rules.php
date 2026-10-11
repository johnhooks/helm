<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\ScanRoute;

use Helm\Navigation\NavigationService;
use Helm\Navigation\NodeGenerator;
use Helm\ShipLink\Ship;
use Helm\ShipLink\Components\PowerMode;

/**
 * Route scan rules for work, discovery probability, cycle costs, and stopping conditions.
 */
final class Rules
{
    /**
     * Minimum discovery probability for each scan attempt.
     */
    public const MIN_DISCOVERY_CHANCE = 0.001;

    /**
     * Maximum cycles allowed per action.
     */
    public const MAX_CYCLES = 720;
    /**
     * Minimum discovery chance ceiling required to continue scanning.
     */
    public const MIN_CEILING = 0.12;

    public function __construct(
        private readonly NavigationService $navigation,
        private readonly NodeGenerator $generator,
    ) {
    }

    /** Capture operating values from the ship at launch. */
    public function initialize(Params $params, Ship $ship, float $distance): RuntimeState
    {
        $efficiency = max(0.1, $ship->navigation()->getEfficiency());
        $output = $ship->power()->getPowerMode()->outputMultiplier();
        $estimate = self::estimate([
            'navigation_efficiency' => $efficiency,
            'base_sensor_range' => $ship->sensors()->getBaseRange(),
            'core_output' => $ship->power()->getOutputMultiplier() / $output,
            'sensor_quality' => $ship->sensors()->getScanSuccessChance(),
            'work_gain' => max(0.1, $ship->navigation()->getSkill() / 0.6),
            'remaining_distance' => $distance, 'required_work' => 0.0, 'accumulated_work' => 0.0,
            'intensity' => $params->intensity ?? 'normal',
            'power_mode' => $ship->power()->getPowerMode()->slug(),
        ]);
        return new RuntimeState(
            cycleSeconds: $estimate['cycle_seconds'],
            powerCost: $estimate['power_cost'],
            workGain: max(0.1, $ship->navigation()->getSkill() / 0.6),
            skill: $ship->navigation()->getSkill(),
            sensorRange: $ship->sensors()->getRange(),
            sensorQuality: $ship->sensors()->getScanSuccessChance(),
            initialDistance: $distance,
            minCeiling: self::MIN_CEILING,
            maxCycles: self::MAX_CYCLES,
            navigationEfficiency: $efficiency,
            baseSensorRange: $ship->sensors()->getBaseRange(),
            coreOutput: $ship->power()->getOutputMultiplier() / $output,
            powerMode: $ship->power()->getPowerMode()->slug(),
            intensity: $params->intensity ?? 'normal',
        );
    }

    public function prepareConnection(RuntimeState $state, Params $params): bool
    {
        $from = $this->navigation->getNode($state->source);
        $to = $this->navigation->getNode($params->targetNodeId ?? 0);
        if ($from === null || $to === null) {
            return false;
        }
        $distance = $from->distanceTo($to);
        $state->remainingDistance = $distance;
        $legDistance = $distance;
        if (!$this->generator->canDirectJump($from, $to, 7.0)) {
            $next = $this->generator->computeWaypoint($from, $to);
            $legDistance = sqrt(($next['x'] - $from->x) ** 2 + ($next['y'] - $from->y) ** 2 + ($next['z'] - $from->z) ** 2);
        }
        $difficulty = $this->generator->corridorDifficulty($from, $to);
        // Work per distance uses the original scan length, avoiding a convex discount per waypoint.
        $state->required = 12 + 7.5 * $legDistance * sqrt($state->initialDistance) * (1 + 0.4 * $difficulty);
        $state->workChance = self::estimate($this->calculationInputs($state))['work_chance'];
        $state->ceiling = min(0.9, (0.55 + 0.3 * $state->skill) * (1 - 0.2 * $difficulty)) * 0.65 ** $state->depth;
        return true;
    }

    public function chanceAt(RuntimeState $state, float $work): float
    {
        return max(self::MIN_DISCOVERY_CHANCE, $state->ceiling * min(1.0, ($work / max(1.0, $state->required)) ** 12));
    }

    /** Marginal chance for the next cycle, including its uncertain work gain. */
    public function nextChance(RuntimeState $state): float
    {
        return (1 - $state->workChance) * $this->chanceAt($state, $state->work)
            + $state->workChance * $this->chanceAt($state, $state->work + $state->workGain);
    }

    public function stopReason(RuntimeState $state, float $power): ?StopReason
    {
        if ($state->ceiling < $state->minCeiling) {
            return StopReason::LowChance;
        }
        if ($state->completed >= $state->maxCycles) {
            return StopReason::CycleLimit;
        }
        return $power < $state->powerCost ? StopReason::Resources : null;
    }

    /** Prepare the following cycle without losing accumulated progress. */
    public function nextCycle(RuntimeState $state, Params $params, Ship $ship): RuntimeState
    {
        if ($state->powerMode === $ship->power()->getPowerMode()->slug()) {
            return $state;
        }
        $next = $this->initialize($params, $ship, $state->initialDistance);
        $data = $state->toArray();
        $operating = $next->toArray();
        foreach (['cycleSeconds', 'powerCost', 'sensorRange', 'sensorQuality', 'navigationEfficiency', 'baseSensorRange', 'coreOutput', 'powerMode', 'workGain', 'skill'] as $property) {
            $data[$property] = $operating[$property];
        }
        return RuntimeState::fromArray($data);
    }

    /** @return array<string, float|string> */
    public function calculationInputs(RuntimeState $state): array
    {
        return [
            'navigation_efficiency' => $state->navigationEfficiency,
            'base_sensor_range' => $state->baseSensorRange,
            'core_output' => $state->coreOutput,
            'sensor_quality' => $state->sensorQuality,
            'work_gain' => $state->workGain,
            'remaining_distance' => $state->remainingDistance,
            'required_work' => $state->required,
            'accumulated_work' => $state->work,
            'power_mode' => $state->powerMode,
            'intensity' => $state->intensity,
        ];
    }

    /**
     * Pure preview calculation; mirrored by formulas/src/scan/route-stats-calculator.ts.
     *
     * @param array<string, float|string> $inputs
     * @return array{cycle_seconds: int, power_cost: float, work_chance: float, estimated_peak_seconds: int}
     */
    public static function estimate(array $inputs): array
    {
        $mode = PowerMode::fromSlug((string) $inputs['power_mode']) ?? PowerMode::Normal;
        $output = $mode->outputMultiplier();
        $speed = match ($inputs['intensity']) {
            'economy' => 0.5, 'fast' => 2.0, default => 1.0
        };
        $seconds = (int) ceil(210 / max(0.1, (float) $inputs['navigation_efficiency']) / $speed / $output);
        $range = (float) $inputs['base_sensor_range'] * (float) $inputs['core_output'] * $output;
        $ratio = min(1.0, (float) $inputs['remaining_distance'] / max(0.1, $range));
        $chance = min(0.95, 0.65 + 0.2 * (1 - $ratio) + 0.1 * (float) $inputs['sensor_quality']);
        $cycles = (int) ceil(max(0.0, (float) $inputs['required_work'] - (float) $inputs['accumulated_work']) / max(0.001, (float) $inputs['work_gain'] * $chance));
        return ['cycle_seconds' => $seconds, 'power_cost' => $speed * $output ** 2,
            'work_chance' => $chance, 'estimated_peak_seconds' => $cycles * $seconds];
    }

    /** @return array<string, mixed> */
    public function progress(RuntimeState $state, bool $final, ?StopReason $stopReason = null): array
    {
        return [
            'calculation_inputs' => $this->calculationInputs($state),
            'cycle_seconds' => $state->cycleSeconds,
            'completed_cycles' => $state->completed,
            'cycle_number' => $final ? $state->completed : $state->completed + 1,
            'discovery_depth' => $state->depth,
            'accumulated_work' => $state->work,
            'required_work' => $state->required,
            'work_progress' => min(1.0, $state->work / max(1.0, $state->required)),
            'estimated_peak_seconds' => $final ? null : (int) ceil(max(0.0, $state->required - $state->work) / max(0.001, $state->workGain * $state->workChance)) * $state->cycleSeconds,
            'discovery_chance' => $final ? null : $this->nextChance($state),
            'maximum_discovery_chance' => $state->ceiling,
            'next_cycle_cost' => ['power' => $final ? 0 : $state->powerCost],
            'spent' => ['power' => $state->spent],
            'stop_reason' => $stopReason?->value,
            'stop_message' => $stopReason?->message(),
        ];
    }
}
