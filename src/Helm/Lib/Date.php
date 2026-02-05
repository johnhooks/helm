<?php

declare(strict_types=1);

namespace Helm\Lib;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Date utility functions.
 *
 * Provides simple wrappers for common datetime operations in UTC.
 */
final class Date
{
    private static ?DateTimeZone $utc = null;

    /**
     * Get current UTC timestamp.
     */
    public static function now(): DateTimeImmutable
    {
        return new DateTimeImmutable('now', self::utc());
    }

    /**
     * Get current UTC timestamp as MySQL datetime string.
     */
    public static function nowString(): string
    {
        return self::now()->format('Y-m-d H:i:s');
    }

    /**
     * Create a DateTimeImmutable from a MySQL datetime string (assumed UTC).
     */
    public static function fromString(string $datetime): DateTimeImmutable
    {
        return new DateTimeImmutable($datetime, self::utc());
    }

    /**
     * Format a DateTimeImmutable as MySQL datetime string.
     */
    public static function toString(DateTimeImmutable $dt): string
    {
        return $dt->format('Y-m-d H:i:s');
    }

    /**
     * Add seconds to a DateTimeImmutable.
     */
    public static function addSeconds(DateTimeImmutable $dt, int $seconds): DateTimeImmutable
    {
        return $dt->modify("+{$seconds} seconds");
    }

    /**
     * Subtract seconds from a DateTimeImmutable.
     */
    public static function subSeconds(DateTimeImmutable $dt, int $seconds): DateTimeImmutable
    {
        return $dt->modify("-{$seconds} seconds");
    }

    /**
     * Subtract minutes from a DateTimeImmutable.
     */
    public static function subMinutes(DateTimeImmutable $dt, int $minutes): DateTimeImmutable
    {
        return $dt->modify("-{$minutes} minutes");
    }

    /**
     * Get the UTC timezone (cached).
     */
    private static function utc(): DateTimeZone
    {
        return self::$utc ??= new DateTimeZone('UTC');
    }
}
