<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\ScanRoute;

use Helm\Navigation\NavigationService;
use Helm\Navigation\NodeGenerator;
use Helm\ShipLink\Ship;

/**
 * Route scan rules for work, discovery probability, cycle costs, and stopping conditions.
 */
final class Rules
{
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
        $speed = match ($params->intensity ?? 'normal') {
            'economy' => 0.5,
            'fast' => 2.0,
            default => 1.0,
        };
        $efficiency = max(0.1, $ship->navigation()->getEfficiency());
        return new RuntimeState(
            cycleSeconds: (int) ceil(300 * 0.7 / $efficiency / $speed),
            coreCost: (int) ceil($speed),
            coreBudget: min(400, (int) floor($ship->power()->getCoreLife() * 0.6)),
            workGain: max(0.1, $ship->navigation()->getSkill() / 0.6),
            skill: $ship->navigation()->getSkill(),
            sensorRange: $ship->sensors()->getRange(),
            sensorQuality: $ship->sensors()->getScanSuccessChance(),
            initialDistance: $distance,
            minCeiling: self::MIN_CEILING,
            maxCycles: self::MAX_CYCLES,
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
        $legDistance = $distance;
        if (!$this->generator->canDirectJump($from, $to, 7.0)) {
            $next = $this->generator->computeWaypoint($from, $to);
            $legDistance = sqrt(($next['x'] - $from->x) ** 2 + ($next['y'] - $from->y) ** 2 + ($next['z'] - $from->z) ** 2);
        }
        $difficulty = $this->generator->corridorDifficulty($from, $to);
        // Work per distance uses the original scan length, avoiding a convex discount per waypoint.
        $state->required = 12 + 7.5 * $legDistance * sqrt($state->initialDistance) * (1 + 0.4 * $difficulty);
        $ratio = min(1.0, $distance / max(0.1, $state->sensorRange));
        $state->workChance = min(0.95, 0.65 + 0.2 * (1 - $ratio) + 0.1 * $state->sensorQuality);
        $state->ceiling = min(0.9, (0.55 + 0.3 * $state->skill) * (1 - 0.2 * $difficulty)) * 0.65 ** $state->depth;
        return true;
    }

    public function chanceAt(RuntimeState $state, float $work): float
    {
        return $state->ceiling * min(1.0, ($work / max(1.0, $state->required)) ** 12);
    }

    /** Marginal chance for the next cycle, including its uncertain work gain. */
    public function nextChance(RuntimeState $state): float
    {
        return (1 - $state->workChance) * $this->chanceAt($state, $state->work)
            + $state->workChance * $this->chanceAt($state, $state->work + $state->workGain);
    }

    public function stopReason(RuntimeState $state, float $core): ?StopReason
    {
        if ($state->ceiling < $state->minCeiling) {
            return StopReason::LowChance;
        }
        if ($state->completed >= $state->maxCycles) {
            return StopReason::CycleLimit;
        }
        if ($state->spent + $state->coreCost > $state->coreBudget) {
            return StopReason::Budget;
        }
        return $core < $state->coreCost ? StopReason::Resources : null;
    }

    /** @return array<string, mixed> */
    public function progress(RuntimeState $state, bool $final, ?StopReason $stopReason = null): array
    {
        return [
            'cycle_seconds' => $state->cycleSeconds,
            'completed_cycles' => $state->completed,
            'cycle_number' => $final ? $state->completed : $state->completed + 1,
            'discovery_depth' => $state->depth,
            'accumulated_work' => $state->work,
            'discovery_chance' => $final ? null : $this->nextChance($state),
            'maximum_discovery_chance' => $state->ceiling,
            'next_cycle_cost' => ['core_life' => $final ? 0 : $state->coreCost],
            'spent' => ['core_life' => $state->spent],
            'budget' => ['core_life' => $state->coreBudget],
            'stop_reason' => $stopReason?->value,
            'stop_message' => $stopReason?->message(),
        ];
    }
}
