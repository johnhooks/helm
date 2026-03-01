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
     * A fixed time returned by now() during tests/simulation.
     *
     * @internal For unit tests and simulation only.
     */
    private static ?DateTimeImmutable $testNow = null;

    /**
     * Get current UTC timestamp.
     *
     * Returns the test time if set via setTestNow(), otherwise real time.
     */
    public static function now(): DateTimeImmutable
    {
        return self::$testNow ?? new DateTimeImmutable('now', self::utc());
    }

    /**
     * Set a fixed time to be returned by now(). For unit tests and simulation only.
     *
     * Pass null to clear and return to real time.
     *
     * @param DateTimeImmutable|string|null $time A DateTimeImmutable, a datetime string, or null to clear.
     */
    public static function setTestNow(DateTimeImmutable|string|null $time = null): void
    {
        if (is_string($time)) {
            $time = new DateTimeImmutable($time, self::utc());
        }
        self::$testNow = $time;
    }

    /**
     * Get the current test time, or null if real time is active.
     *
     * @internal For unit tests and simulation only.
     */
    public static function getTestNow(): ?DateTimeImmutable
    {
        return self::$testNow;
    }

    /**
     * Whether a test time is currently active.
     *
     * @internal For unit tests and simulation only.
     */
    public static function hasTestNow(): bool
    {
        return self::$testNow !== null;
    }

    /**
     * Advance the test time by the given number of seconds.
     *
     * @internal For unit tests and simulation only.
     *
     * @throws \LogicException If no test time is set.
     */
    public static function advanceTestNow(int $seconds): DateTimeImmutable
    {
        if (self::$testNow === null) {
            throw new \LogicException('Cannot advance test time: no test time is set. Call Date::setTestNow() first.');
        }
        self::$testNow = self::addSeconds(self::$testNow, $seconds);
        return self::$testNow;
    }

    /**
     * Execute a callback with a fixed test time, then restore the previous state.
     *
     * @internal For unit tests and simulation only.
     *
     * @template T
     * @param DateTimeImmutable|string $time The test time to use during the callback.
     * @param callable(): T $callback
     * @return T
     */
    public static function withTestNow(DateTimeImmutable|string $time, callable $callback): mixed
    {
        $previous = self::$testNow;
        self::setTestNow($time);
        try {
            return $callback();
        } finally {
            self::$testNow = $previous;
        }
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
