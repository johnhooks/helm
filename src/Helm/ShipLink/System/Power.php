<?php

declare(strict_types=1);

namespace Helm\ShipLink\System;

use DateTimeImmutable;
use Helm\Lib\Date;
use Helm\ShipLink\Components\PowerMode;
use Helm\ShipLink\Contracts\PowerSystem;
use Helm\ShipLink\Loadout;
use Helm\ShipLink\Models\ShipState;

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
 * Ship is responsible for all mutations to ShipState/components.
 */
final class Power implements PowerSystem
{
    public function __construct(
        private ShipState $state,
        private Loadout $loadout,
    ) {
    }

    public function getCurrentPower(?DateTimeImmutable $now = null): float
    {
        $now ??= Date::now();

        if ($this->state->power_full_at === null) {
            return $this->state->power_max;
        }

        if ($now >= $this->state->power_full_at) {
            return $this->state->power_max;
        }

        // Power regenerates at core's regen rate × power mode multiplier per hour
        $regenRate = $this->getRegenRate();
        $secondsUntilFull = $this->state->power_full_at->getTimestamp() - $now->getTimestamp();
        $hoursUntilFull = $secondsUntilFull / 3600.0;
        $powerNeeded = $hoursUntilFull * $regenRate;

        return max(0.0, $this->state->power_max - $powerNeeded);
    }

    public function getMaxPower(): float
    {
        return $this->state->power_max;
    }

    public function getRegenRate(): float
    {
        return ($this->loadout->core()->product()->rate ?? 0.0) * $this->state->power_mode->regenMultiplier();
    }

    public function hasAvailable(float $amount): bool
    {
        return $this->getCurrentPower() >= $amount;
    }

    public function getCoreLife(): float
    {
        return (float) ($this->loadout->core()->life() ?? 0);
    }

    public function isDepleted(): bool
    {
        return $this->getCoreLife() <= 0.0;
    }

    public function getFullAt(): ?DateTimeImmutable
    {
        return $this->state->power_full_at;
    }

    public function getOutputMultiplier(): float
    {
        return ($this->loadout->core()->product()->mult_a ?? 0.0) * $this->state->power_mode->outputMultiplier();
    }

    public function getPowerMode(): PowerMode
    {
        return $this->state->power_mode;
    }

    public function getDecayMultiplier(): float
    {
        return $this->state->power_mode->decayMultiplier();
    }

    public function calculatePowerFullAtAfterConsumption(float $amount, ?DateTimeImmutable $now = null): DateTimeImmutable
    {
        $now ??= Date::now();

        $current = $this->getCurrentPower($now);
        $newLevel = max(0.0, $current - $amount);
        $deficit = $this->state->power_max - $newLevel;

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
