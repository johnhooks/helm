<?php

declare(strict_types=1);

namespace Helm\ShipLink\Components;

/**
 * Power mode states.
 *
 * Players choose one mode. No sliders, no micromanagement.
 *
 * Mode affects:
 * - Output multiplier: scales ALL system capabilities (scan range, jump distance, speed, shields)
 * - Decay multiplier: scales core life consumption during actions
 * - Regen multiplier: scales power regeneration rate
 *
 * Mode is locked during actions - plan your mode before starting long-running actions.
 */
enum PowerMode: int
{
    case Efficiency = 1;  // Stranded, conserving - slow but safe
    case Normal = 2;      // Standard operations
    case Overdrive = 3;   // Emergency, pushing it - fast but burns core

    public function slug(): string
    {
        return match ($this) {
            self::Efficiency => 'efficiency',
            self::Normal => 'normal',
            self::Overdrive => 'overdrive',
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Efficiency => __('Efficiency', 'helm'),
            self::Normal => __('Normal', 'helm'),
            self::Overdrive => __('Overdrive', 'helm'),
        };
    }

    /**
     * Output multiplier - scales all system capabilities.
     *
     * Effective output = coreType.baseOutput × powerMode.outputMultiplier
     */
    public function outputMultiplier(): float
    {
        return match ($this) {
            self::Efficiency => 0.7,
            self::Normal => 1.0,
            self::Overdrive => 1.3,
        };
    }

    /**
     * Decay multiplier - scales core life consumption.
     *
     * 0% = no decay (safe harbor in efficiency mode)
     * 100% = baseline
     * 250% = burning hot
     */
    public function decayMultiplier(): float
    {
        return match ($this) {
            self::Efficiency => 0.0,
            self::Normal => 1.0,
            self::Overdrive => 2.5,
        };
    }

    /**
     * Regen multiplier - scales power regeneration rate.
     */
    public function regenMultiplier(): float
    {
        return match ($this) {
            self::Efficiency => 0.5,
            self::Normal => 1.0,
            self::Overdrive => 1.3,
        };
    }
}
