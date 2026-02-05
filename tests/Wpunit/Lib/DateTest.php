<?php

declare(strict_types=1);

namespace Tests\Wpunit\Lib;

use DateTimeImmutable;
use DateTimeZone;
use Helm\Lib\Date;

/**
 * @covers \Helm\Lib\Date
 */
final class DateTest extends \Codeception\TestCase\WPTestCase
{
    public function test_now_returns_datetime_immutable(): void
    {
        $result = Date::now();

        $this->assertInstanceOf(DateTimeImmutable::class, $result);
    }

    public function test_now_returns_utc_timezone(): void
    {
        $result = Date::now();

        $this->assertSame('UTC', $result->getTimezone()->getName());
    }

    public function test_now_returns_current_time(): void
    {
        $before = time();
        $result = Date::now();
        $after = time();

        $this->assertGreaterThanOrEqual($before, $result->getTimestamp());
        $this->assertLessThanOrEqual($after, $result->getTimestamp());
    }

    public function test_now_string_returns_mysql_format(): void
    {
        $result = Date::nowString();

        // Verify format matches Y-m-d H:i:s
        $this->assertMatchesRegularExpression(
            '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/',
            $result
        );
    }

    public function test_now_string_is_consistent_with_now(): void
    {
        // Get both at roughly the same time
        $now = Date::now();
        $nowString = Date::nowString();

        // Parse the string back and compare (within 1 second tolerance)
        $parsed = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $nowString, new DateTimeZone('UTC'));

        $this->assertNotFalse($parsed);
        $this->assertLessThanOrEqual(1, abs($now->getTimestamp() - $parsed->getTimestamp()));
    }

    public function test_from_string_parses_mysql_datetime(): void
    {
        $result = Date::fromString('2024-06-15 14:30:00');

        $this->assertInstanceOf(DateTimeImmutable::class, $result);
        $this->assertSame('2024-06-15 14:30:00', $result->format('Y-m-d H:i:s'));
    }

    public function test_from_string_returns_utc_timezone(): void
    {
        $result = Date::fromString('2024-06-15 14:30:00');

        $this->assertSame('UTC', $result->getTimezone()->getName());
    }

    public function test_from_string_handles_midnight(): void
    {
        $result = Date::fromString('2024-01-01 00:00:00');

        $this->assertSame('2024-01-01 00:00:00', $result->format('Y-m-d H:i:s'));
    }

    public function test_from_string_handles_end_of_day(): void
    {
        $result = Date::fromString('2024-12-31 23:59:59');

        $this->assertSame('2024-12-31 23:59:59', $result->format('Y-m-d H:i:s'));
    }

    public function test_to_string_formats_datetime(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 14:30:45', new DateTimeZone('UTC'));

        $result = Date::toString($dt);

        $this->assertSame('2024-06-15 14:30:45', $result);
    }

    public function test_to_string_preserves_precision(): void
    {
        $dt = new DateTimeImmutable('2024-01-01 00:00:00', new DateTimeZone('UTC'));

        $result = Date::toString($dt);

        $this->assertSame('2024-01-01 00:00:00', $result);
    }

    public function test_add_seconds_positive(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 14:30:00', new DateTimeZone('UTC'));

        $result = Date::addSeconds($dt, 30);

        $this->assertSame('2024-06-15 14:30:30', $result->format('Y-m-d H:i:s'));
    }

    public function test_add_seconds_crosses_minute_boundary(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 14:30:45', new DateTimeZone('UTC'));

        $result = Date::addSeconds($dt, 30);

        $this->assertSame('2024-06-15 14:31:15', $result->format('Y-m-d H:i:s'));
    }

    public function test_add_seconds_crosses_hour_boundary(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 14:59:30', new DateTimeZone('UTC'));

        $result = Date::addSeconds($dt, 60);

        $this->assertSame('2024-06-15 15:00:30', $result->format('Y-m-d H:i:s'));
    }

    public function test_add_seconds_crosses_day_boundary(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 23:59:30', new DateTimeZone('UTC'));

        $result = Date::addSeconds($dt, 60);

        $this->assertSame('2024-06-16 00:00:30', $result->format('Y-m-d H:i:s'));
    }

    public function test_add_seconds_large_value(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 12:00:00', new DateTimeZone('UTC'));

        // Add 1 hour (3600 seconds)
        $result = Date::addSeconds($dt, 3600);

        $this->assertSame('2024-06-15 13:00:00', $result->format('Y-m-d H:i:s'));
    }

    public function test_add_seconds_very_large_value(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 12:00:00', new DateTimeZone('UTC'));

        // Add 24 hours (86400 seconds)
        $result = Date::addSeconds($dt, 86400);

        $this->assertSame('2024-06-16 12:00:00', $result->format('Y-m-d H:i:s'));
    }

    public function test_add_seconds_zero(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 14:30:00', new DateTimeZone('UTC'));

        $result = Date::addSeconds($dt, 0);

        $this->assertSame('2024-06-15 14:30:00', $result->format('Y-m-d H:i:s'));
    }

    public function test_add_seconds_returns_new_instance(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 14:30:00', new DateTimeZone('UTC'));

        $result = Date::addSeconds($dt, 30);

        $this->assertNotSame($dt, $result);
        $this->assertSame('2024-06-15 14:30:00', $dt->format('Y-m-d H:i:s'));
    }

    public function test_sub_seconds_positive(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 14:30:30', new DateTimeZone('UTC'));

        $result = Date::subSeconds($dt, 30);

        $this->assertSame('2024-06-15 14:30:00', $result->format('Y-m-d H:i:s'));
    }

    public function test_sub_seconds_crosses_minute_boundary(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 14:30:15', new DateTimeZone('UTC'));

        $result = Date::subSeconds($dt, 30);

        $this->assertSame('2024-06-15 14:29:45', $result->format('Y-m-d H:i:s'));
    }

    public function test_sub_seconds_crosses_hour_boundary(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 15:00:30', new DateTimeZone('UTC'));

        $result = Date::subSeconds($dt, 60);

        $this->assertSame('2024-06-15 14:59:30', $result->format('Y-m-d H:i:s'));
    }

    public function test_sub_seconds_crosses_day_boundary(): void
    {
        $dt = new DateTimeImmutable('2024-06-16 00:00:30', new DateTimeZone('UTC'));

        $result = Date::subSeconds($dt, 60);

        $this->assertSame('2024-06-15 23:59:30', $result->format('Y-m-d H:i:s'));
    }

    public function test_sub_seconds_large_value(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 13:00:00', new DateTimeZone('UTC'));

        // Subtract 1 hour (3600 seconds)
        $result = Date::subSeconds($dt, 3600);

        $this->assertSame('2024-06-15 12:00:00', $result->format('Y-m-d H:i:s'));
    }

    public function test_sub_seconds_zero(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 14:30:00', new DateTimeZone('UTC'));

        $result = Date::subSeconds($dt, 0);

        $this->assertSame('2024-06-15 14:30:00', $result->format('Y-m-d H:i:s'));
    }

    public function test_sub_seconds_returns_new_instance(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 14:30:30', new DateTimeZone('UTC'));

        $result = Date::subSeconds($dt, 30);

        $this->assertNotSame($dt, $result);
        $this->assertSame('2024-06-15 14:30:30', $dt->format('Y-m-d H:i:s'));
    }

    public function test_sub_minutes_positive(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 14:30:00', new DateTimeZone('UTC'));

        $result = Date::subMinutes($dt, 5);

        $this->assertSame('2024-06-15 14:25:00', $result->format('Y-m-d H:i:s'));
    }

    public function test_sub_minutes_crosses_hour_boundary(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 15:10:00', new DateTimeZone('UTC'));

        $result = Date::subMinutes($dt, 20);

        $this->assertSame('2024-06-15 14:50:00', $result->format('Y-m-d H:i:s'));
    }

    public function test_sub_minutes_crosses_day_boundary(): void
    {
        $dt = new DateTimeImmutable('2024-06-16 00:10:00', new DateTimeZone('UTC'));

        $result = Date::subMinutes($dt, 20);

        $this->assertSame('2024-06-15 23:50:00', $result->format('Y-m-d H:i:s'));
    }

    public function test_sub_minutes_large_value(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 14:00:00', new DateTimeZone('UTC'));

        // Subtract 2 hours (120 minutes)
        $result = Date::subMinutes($dt, 120);

        $this->assertSame('2024-06-15 12:00:00', $result->format('Y-m-d H:i:s'));
    }

    public function test_sub_minutes_zero(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 14:30:00', new DateTimeZone('UTC'));

        $result = Date::subMinutes($dt, 0);

        $this->assertSame('2024-06-15 14:30:00', $result->format('Y-m-d H:i:s'));
    }

    public function test_sub_minutes_returns_new_instance(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 14:30:00', new DateTimeZone('UTC'));

        $result = Date::subMinutes($dt, 5);

        $this->assertNotSame($dt, $result);
        $this->assertSame('2024-06-15 14:30:00', $dt->format('Y-m-d H:i:s'));
    }

    public function test_roundtrip_consistency(): void
    {
        // Create a datetime, convert to string, parse it back
        $original = Date::now();
        $string = Date::toString($original);
        $parsed = Date::fromString($string);

        $this->assertSame($original->format('Y-m-d H:i:s'), $parsed->format('Y-m-d H:i:s'));
    }

    public function test_add_then_sub_returns_original(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 14:30:00', new DateTimeZone('UTC'));

        $added = Date::addSeconds($dt, 300);
        $result = Date::subSeconds($added, 300);

        $this->assertSame('2024-06-15 14:30:00', $result->format('Y-m-d H:i:s'));
    }

    public function test_multiple_operations_chain(): void
    {
        $dt = new DateTimeImmutable('2024-06-15 12:00:00', new DateTimeZone('UTC'));

        // Add 1 hour, subtract 30 minutes, add 15 minutes
        $result = Date::addSeconds($dt, 3600);        // 13:00:00
        $result = Date::subMinutes($result, 30);       // 12:30:00
        $result = Date::addSeconds($result, 900);      // 12:45:00

        $this->assertSame('2024-06-15 12:45:00', $result->format('Y-m-d H:i:s'));
    }

    public function test_leap_year_handling(): void
    {
        // 2024 is a leap year
        $dt = new DateTimeImmutable('2024-02-28 23:59:30', new DateTimeZone('UTC'));

        $result = Date::addSeconds($dt, 60);

        $this->assertSame('2024-02-29 00:00:30', $result->format('Y-m-d H:i:s'));
    }

    public function test_non_leap_year_handling(): void
    {
        // 2023 is not a leap year
        $dt = new DateTimeImmutable('2023-02-28 23:59:30', new DateTimeZone('UTC'));

        $result = Date::addSeconds($dt, 60);

        $this->assertSame('2023-03-01 00:00:30', $result->format('Y-m-d H:i:s'));
    }

    public function test_year_boundary_crossing(): void
    {
        $dt = new DateTimeImmutable('2024-12-31 23:59:30', new DateTimeZone('UTC'));

        $result = Date::addSeconds($dt, 60);

        $this->assertSame('2025-01-01 00:00:30', $result->format('Y-m-d H:i:s'));
    }

    public function test_comparison_works_correctly(): void
    {
        $earlier = Date::fromString('2024-06-15 14:00:00');
        $later = Date::fromString('2024-06-15 15:00:00');

        $this->assertTrue($earlier < $later);
        $this->assertTrue($later > $earlier);
        $this->assertFalse($earlier > $later);
    }

    public function test_equality_works_correctly(): void
    {
        $dt1 = Date::fromString('2024-06-15 14:30:00');
        $dt2 = Date::fromString('2024-06-15 14:30:00');

        $this->assertEquals($dt1, $dt2);
        $this->assertTrue($dt1 == $dt2);
    }
}
