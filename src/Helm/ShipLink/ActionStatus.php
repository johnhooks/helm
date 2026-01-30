<?php

declare(strict_types=1);

namespace Helm\ShipLink;

/**
 * Status of a ship action.
 */
enum ActionStatus: string
{
    case Pending = 'pending';
    case Running = 'running';
    case Fulfilled = 'fulfilled';
    case Partial = 'partial';
    case Failed = 'failed';

    public function label(): string
    {
        return match ($this) {
            self::Pending => __('Pending', 'helm'),
            self::Running => __('Running', 'helm'),
            self::Fulfilled => __('Fulfilled', 'helm'),
            self::Partial => __('Partial', 'helm'),
            self::Failed => __('Failed', 'helm'),
        };
    }

    /**
     * Check if this status represents a completed action (terminal state).
     */
    public function isComplete(): bool
    {
        return match ($this) {
            self::Pending, self::Running => false,
            self::Fulfilled, self::Partial, self::Failed => true,
        };
    }

    /**
     * Check if this status represents a successful outcome.
     */
    public function isSuccess(): bool
    {
        return match ($this) {
            self::Fulfilled, self::Partial => true,
            self::Pending, self::Running, self::Failed => false,
        };
    }
}
