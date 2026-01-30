<?php

declare(strict_types=1);

namespace Helm\ShipLink\System;

use Helm\ShipLink\Contracts\Hull as HullContract;
use Helm\ShipLink\ShipModel;

/**
 * Hull system implementation.
 */
final class Hull implements HullContract
{
    public function __construct(
        private ShipModel $model,
    ) {
    }

    public function getIntegrity(): float
    {
        return $this->model->hullIntegrity;
    }

    public function getMaxIntegrity(): float
    {
        return $this->model->hullMax;
    }

    public function getIntegrityPercent(): float
    {
        if ($this->model->hullMax <= 0) {
            return 0.0;
        }

        return $this->model->hullIntegrity / $this->model->hullMax;
    }

    public function damage(float $amount): void
    {
        $this->model->damageHull($amount);
    }

    public function repair(float $amount): void
    {
        $this->model->repairHull($amount);
    }

    public function isDestroyed(): bool
    {
        return $this->model->isDestroyed();
    }

    public function isCritical(float $threshold = 0.25): bool
    {
        return $this->getIntegrityPercent() < $threshold;
    }
}
