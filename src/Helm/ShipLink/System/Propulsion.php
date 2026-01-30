<?php

declare(strict_types=1);

namespace Helm\ShipLink\System;

use Helm\ShipLink\Contracts\Propulsion as PropulsionContract;
use Helm\ShipLink\ShipModel;

/**
 * Propulsion system implementation.
 */
final class Propulsion implements PropulsionContract
{
    /**
     * Base jump duration in seconds per light-year at 1.0x speed.
     */
    private const BASE_SECONDS_PER_LY = 60;

    /**
     * Maximum jump range (limited by drive, not core life).
     */
    private const MAX_JUMP_RANGE = 15.0;

    public function __construct(
        private ShipModel $model,
    ) {
    }

    public function getJumpDuration(float $distanceLy): int
    {
        $speedMultiplier = $this->getSpeedMultiplier();
        $baseDuration = $distanceLy * self::BASE_SECONDS_PER_LY;

        // Higher speed = shorter duration
        return (int) ceil($baseDuration / $speedMultiplier);
    }

    public function getCoreDecayMultiplier(): float
    {
        return $this->model->driveType->decayMultiplier();
    }

    public function getSpeedMultiplier(): float
    {
        return $this->model->driveType->speedMultiplier();
    }

    public function getMaxRange(): float
    {
        return self::MAX_JUMP_RANGE;
    }

    public function canReach(float $distanceLy): bool
    {
        return $distanceLy <= $this->getMaxRange();
    }

    public function calculateCoreCost(float $distanceLy): float
    {
        // Core cost = distance * core type multiplier * drive decay multiplier
        return $distanceLy
            * $this->model->coreType->jumpCostMultiplier()
            * $this->getCoreDecayMultiplier();
    }
}
