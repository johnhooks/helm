<?php

declare(strict_types=1);

namespace Helm\ShipLink\System;

use DateTimeImmutable;
use Helm\ShipLink\Contracts\Shields as ShieldsContract;
use Helm\ShipLink\ShipModel;

/**
 * Shield system implementation.
 */
final class Shields implements ShieldsContract
{
    public function __construct(
        private ShipModel $model,
    ) {
    }

    public function getCurrentStrength(): float
    {
        return $this->model->currentShields();
    }

    public function getMaxStrength(): float
    {
        return $this->model->shieldsMax;
    }

    public function getRegenRate(): float
    {
        return $this->model->shieldType->regenRate();
    }

    public function absorb(float $damage): float
    {
        $current = $this->getCurrentStrength();

        if ($current >= $damage) {
            $this->model->damageShields($damage);
            return 0.0;
        }

        // Shields absorb what they can, return overflow
        $this->model->damageShields($current);
        return $damage - $current;
    }

    public function isDepleted(): bool
    {
        return $this->getCurrentStrength() <= 0.0;
    }

    public function getFullAt(): ?DateTimeImmutable
    {
        return $this->model->shieldsFullAt;
    }
}
