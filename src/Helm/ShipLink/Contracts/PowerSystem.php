<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

use DateTimeImmutable;
use Helm\ShipLink\Components\PowerMode;

/**
 * Power system contract.
 *
 * Manages ship power (regenerating tactical resource) and core life
 * (finite strategic resource consumed on jumps).
 *
 * This is a read-only interface - Ship is responsible for all mutations.
 */
interface PowerSystem
{
    /**
     * Get current available power units.
     */
    public function getCurrentPower(): float;

    /**
     * Get maximum power capacity.
     */
    public function getMaxPower(): float;

    /**
     * Get power regeneration rate (units per hour).
     */
    public function getRegenRate(): float;

    /**
     * Check if enough power is available.
     */
    public function hasAvailable(float $amount): bool;

    /**
     * Get remaining core life in light-years.
     */
    public function getCoreLife(): float;

    /**
     * Check if core is depleted (ship is derelict).
     */
    public function isDepleted(): bool;

    /**
     * Get timestamp when power will be full.
     */
    public function getFullAt(): ?DateTimeImmutable;

    /**
     * Get current output multiplier.
     *
     * This is the core's effective output, combining:
     * - Core type's base output
     * - Power mode multiplier
     *
     * Used by other systems to scale their capabilities.
     */
    public function getOutputMultiplier(): float;

    /**
     * Get current power mode.
     */
    public function getPowerMode(): PowerMode;

    /**
     * Get current decay multiplier.
     *
     * Used by Ship to calculate core life cost for jumps.
     * Returns 0 in Efficiency mode (safe harbor).
     */
    public function getDecayMultiplier(): float;

    /**
     * Calculate what powerFullAt should be after consuming power.
     *
     * Used by Ship to determine the new timestamp when mutating.
     *
     * @param float $amount Power to consume
     * @param DateTimeImmutable|null $now Current time (defaults to now)
     * @return DateTimeImmutable New powerFullAt value
     */
    public function calculatePowerFullAtAfterConsumption(float $amount, ?DateTimeImmutable $now = null): DateTimeImmutable;
}
