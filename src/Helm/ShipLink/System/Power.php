<?php

declare(strict_types=1);

namespace Helm\ShipLink\System;

use DateTimeImmutable;
use Helm\Lib\Date;
use Helm\ShipLink\Components\PowerMode;
use Helm\ShipLink\Contracts\PowerSystem;
use Helm\ShipLink\Models\ShipSystems;

/**
 * Power system implementation.
 *
 * Manages ship power (regenerating tactical resource) and core life
 * (finite strategic resource consumed on jumps).
 *
 * Power uses the "full_at" timestamp pattern: powerFullAt indicates when
 * power will reach max. If in the past, power is at max. If in the future,
 * we calculate current power based on regen rate.
 *
 * This system is read-only - it reports state and calculates values.
 * Ship is responsible for all mutations to ShipSystems.
 */
final class Power implements PowerSystem
{
    public function __construct(
        private ShipSystems $systems,
    ) {
    }

    public function getCurrentPower(?DateTimeImmutable $now = null): float
    {
        $now ??= Date::now();

        if ($this->systems->power_full_at === null) {
            return $this->systems->power_max;
        }

        if ($now >= $this->systems->power_full_at) {
            return $this->systems->power_max;
        }

        // Power regenerates at core's regen rate × power mode multiplier per hour
        $regenRate = $this->getRegenRate();
        $secondsUntilFull = $this->systems->power_full_at->getTimestamp() - $now->getTimestamp();
        $hoursUntilFull = $secondsUntilFull / 3600.0;
        $powerNeeded = $hoursUntilFull * $regenRate;

        return max(0.0, $this->systems->power_max - $powerNeeded);
    }

    public function getMaxPower(): float
    {
        return $this->systems->power_max;
    }

    public function getRegenRate(): float
    {
        return $this->systems->core_type->regenRate() * $this->systems->power_mode->regenMultiplier();
    }

    public function hasAvailable(float $amount): bool
    {
        return $this->getCurrentPower() >= $amount;
    }

    public function getCoreLife(): float
    {
        return $this->systems->core_life;
    }

    public function isDepleted(): bool
    {
        return $this->systems->core_life <= 0.0;
    }

    public function getFullAt(): ?DateTimeImmutable
    {
        return $this->systems->power_full_at;
    }

    public function getOutputMultiplier(): float
    {
        return $this->systems->core_type->baseOutput() * $this->systems->power_mode->outputMultiplier();
    }

    public function getPowerMode(): PowerMode
    {
        return $this->systems->power_mode;
    }

    public function getDecayMultiplier(): float
    {
        return $this->systems->power_mode->decayMultiplier();
    }

    public function calculatePowerFullAtAfterConsumption(float $amount, ?DateTimeImmutable $now = null): DateTimeImmutable
    {
        $now ??= Date::now();

        $current = $this->getCurrentPower($now);
        $newLevel = max(0.0, $current - $amount);
        $deficit = $this->systems->power_max - $newLevel;

        if ($deficit <= 0) {
            return $now;
        }

        // Calculate when power will be full again
        $regenRate = $this->getRegenRate();
        $hoursToFull = $deficit / $regenRate;
        $secondsToFull = (int) ceil($hoursToFull * 3600);

        return Date::addSeconds($now, $secondsToFull);
    }
}
