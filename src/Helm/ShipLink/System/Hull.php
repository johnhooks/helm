<?php

declare(strict_types=1);

namespace Helm\ShipLink\System;

use Helm\ShipLink\Contracts\Hull as HullContract;
use Helm\ShipLink\Models\ShipState;

/**
 * Hull system implementation.
 *
 * Hull integrity represents structural damage. Unlike shields and power,
 * hull does not regenerate - it must be repaired at a station or with
 * repair resources.
 *
 * This system is read-only - it reports state and calculates values.
 * Ship is responsible for all mutations to ShipState.
 */
final class Hull implements HullContract
{
    public function __construct(
        private ShipState $state,
    ) {
    }

    public function getIntegrity(): float
    {
        return $this->state->hull_integrity;
    }

    public function getMaxIntegrity(): float
    {
        return $this->state->hull_max;
    }

    public function getIntegrityPercent(): float
    {
        if ($this->state->hull_max <= 0) {
            return 0.0;
        }

        return $this->state->hull_integrity / $this->state->hull_max;
    }

    public function isDestroyed(): bool
    {
        return $this->state->hull_integrity <= 0.0;
    }

    public function isCritical(float $threshold = 0.25): bool
    {
        return $this->getIntegrityPercent() < $threshold;
    }

    public function calculateIntegrityAfterDamage(float $amount): float
    {
        return max(0.0, $this->state->hull_integrity - $amount);
    }

    public function calculateIntegrityAfterRepair(float $amount): float
    {
        return min($this->state->hull_max, $this->state->hull_integrity + $amount);
    }
}
