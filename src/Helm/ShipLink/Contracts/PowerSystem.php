<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

use DateTimeImmutable;

/**
 * Power system contract.
 *
 * Manages ship power (regenerating tactical resource) and core life
 * (finite strategic resource consumed on jumps).
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
}
