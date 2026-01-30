<?php

declare(strict_types=1);

namespace Helm\ShipLink\System;

use DateTimeImmutable;
use Helm\ShipLink\Contracts\PowerSystem;
use Helm\ShipLink\ShipModel;

/**
 * Power system implementation.
 */
final class Power implements PowerSystem
{
    public function __construct(
        private ShipModel $model,
    ) {
    }

    public function getCurrentPower(): float
    {
        return $this->model->currentPower();
    }

    public function getMaxPower(): float
    {
        return $this->model->powerMax;
    }

    public function getRegenRate(): float
    {
        return $this->model->coreType->regenRate();
    }

    public function consume(float $amount): bool
    {
        if (!$this->hasAvailable($amount)) {
            return false;
        }

        $this->model->consumePower($amount);
        return true;
    }

    public function hasAvailable(float $amount): bool
    {
        return $this->getCurrentPower() >= $amount;
    }

    public function getCoreLife(): float
    {
        return $this->model->coreLife;
    }

    public function consumeCoreLife(float $lightyears): void
    {
        $this->model->consumeCoreLife($lightyears);
    }

    public function isDepleted(): bool
    {
        return $this->model->isCoreDepeleted();
    }

    public function getFullAt(): ?DateTimeImmutable
    {
        return $this->model->powerFullAt;
    }
}
