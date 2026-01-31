<?php

declare(strict_types=1);

namespace Helm\ShipLink\System;

use DateTimeImmutable;
use Helm\ShipLink\Components\PowerMode;
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
        return $this->model->coreType->regenRate() * $this->model->powerMode->regenMultiplier();
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

    public function getOutputMultiplier(): float
    {
        return $this->model->coreType->baseOutput() * $this->model->powerMode->outputMultiplier();
    }

    public function getPowerMode(): PowerMode
    {
        return $this->model->powerMode;
    }

    public function setPowerMode(PowerMode $mode): void
    {
        $this->model->powerMode = $mode;
    }

    public function getDecayMultiplier(): float
    {
        return $this->model->powerMode->decayMultiplier();
    }
}
