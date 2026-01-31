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
 * Extends PowerMetrics to provide read-only access to output values
 * for other systems.
 */
interface PowerSystem extends PowerMetrics
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
     * Consume power for an operation.
     *
     * @return bool True if power was available and consumed, false if insufficient.
     */
    public function consume(float $amount): bool;

    /**
     * Check if enough power is available without consuming.
     */
    public function hasAvailable(float $amount): bool;

    /**
     * Get remaining core life in light-years.
     */
    public function getCoreLife(): float;

    /**
     * Consume core life (called during jumps).
     */
    public function consumeCoreLife(float $lightyears): void;

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
     * Set power mode.
     *
     * Mode is locked during actions - cannot change while an action is in progress.
     */
    public function setPowerMode(PowerMode $mode): void;

    /**
     * Get current decay multiplier.
     *
     * Used by Ship to calculate core life cost for jumps.
     * Returns 0 in Efficiency mode (safe harbor).
     */
    public function getDecayMultiplier(): float;
}
