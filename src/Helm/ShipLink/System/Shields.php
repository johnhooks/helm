<?php

declare(strict_types=1);

namespace Helm\ShipLink\System;

use DateTimeImmutable;
use Helm\Lib\Date;
use Helm\ShipLink\Contracts\Shields as ShieldsContract;
use Helm\ShipLink\Models\ShipSystems;

/**
 * Shield system implementation.
 *
 * Shields are a regenerating defensive resource, using the "full_at"
 * timestamp pattern: shieldsFullAt indicates when shields will reach max.
 * If in the past, shields are at max. If in the future, we calculate
 * current strength based on regen rate.
 *
 * This system is read-only - it reports state and calculates values.
 * Ship is responsible for all mutations to ShipSystems.
 */
final class Shields implements ShieldsContract
{
    public function __construct(
        private ShipSystems $systems,
    ) {
    }

    public function getCurrentStrength(?DateTimeImmutable $now = null): float
    {
        $now ??= Date::now();

        if ($this->systems->shields_full_at === null) {
            return $this->systems->shields_max;
        }

        if ($now >= $this->systems->shields_full_at) {
            return $this->systems->shields_max;
        }

        $regenRate = $this->getRegenRate();
        $secondsUntilFull = $this->systems->shields_full_at->getTimestamp() - $now->getTimestamp();
        $hoursUntilFull = $secondsUntilFull / 3600.0;
        $shieldsNeeded = $hoursUntilFull * $regenRate;

        return max(0.0, $this->systems->shields_max - $shieldsNeeded);
    }

    public function getMaxStrength(): float
    {
        return $this->systems->shields_max;
    }

    public function getRegenRate(): float
    {
        return $this->systems->shield_type->regenRate();
    }

    public function isDepleted(): bool
    {
        return $this->getCurrentStrength() <= 0.0;
    }

    public function getFullAt(): ?DateTimeImmutable
    {
        return $this->systems->shields_full_at;
    }

    public function calculateShieldsFullAtAfterDamage(float $amount, ?DateTimeImmutable $now = null): DateTimeImmutable
    {
        $now ??= Date::now();

        $current = $this->getCurrentStrength($now);
        $newLevel = max(0.0, $current - $amount);
        $deficit = $this->systems->shields_max - $newLevel;

        if ($deficit <= 0) {
            return $now;
        }

        $regenRate = $this->getRegenRate();
        $hoursToFull = $deficit / $regenRate;
        $secondsToFull = (int) ceil($hoursToFull * 3600);

        return Date::addSeconds($now, $secondsToFull);
    }

    public function calculateDamageAbsorption(float $damage, ?DateTimeImmutable $now = null): array
    {
        $now ??= Date::now();
        $current = $this->getCurrentStrength($now);

        if ($current >= $damage) {
            return ['absorbed' => $damage, 'overflow' => 0.0];
        }

        return ['absorbed' => $current, 'overflow' => $damage - $current];
    }
}
