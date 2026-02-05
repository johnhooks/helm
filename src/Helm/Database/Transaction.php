<?php

declare(strict_types=1);

namespace Helm\Database;

/**
 * Database transaction helper with automatic nesting detection.
 *
 * MySQL doesn't support true nested transactions. Calling START TRANSACTION
 * while in a transaction implicitly commits the outer transaction.
 *
 * This helper detects if we're already in a transaction and uses SAVEPOINTs:
 * - If not in a transaction: starts a real transaction
 * - If already in a transaction (e.g., test harness): uses savepoints
 *
 * Detection uses @@in_transaction (MySQL 5.7.2+) or falls back to depth tracking.
 */
final class Transaction
{
    /** @var array<int, bool> Stack tracking whether each level is a savepoint */
    private static array $usedSavepoint = [];

    /**
     * Begin a transaction or savepoint.
     */
    public static function begin(): void
    {
        global $wpdb;

        $depth = count(self::$usedSavepoint);

        // Check if we're already in a transaction
        if ($depth > 0 || self::isInTransaction()) {
            // Use savepoint for nesting
            $wpdb->query('SAVEPOINT helm_sp_' . $depth);
            self::$usedSavepoint[] = true;
        } else {
            // Start real transaction
            $wpdb->query('START TRANSACTION');
            self::$usedSavepoint[] = false;
        }
    }

    /**
     * Commit the transaction or release savepoint.
     */
    public static function commit(): void
    {
        global $wpdb;

        if (count(self::$usedSavepoint) === 0) {
            return;
        }

        $usedSavepoint = array_pop(self::$usedSavepoint);
        $depth = count(self::$usedSavepoint);

        if ($usedSavepoint) {
            $wpdb->query('RELEASE SAVEPOINT helm_sp_' . $depth);
        } else {
            $wpdb->query('COMMIT');
        }
    }

    /**
     * Rollback the transaction or to savepoint.
     */
    public static function rollback(): void
    {
        global $wpdb;

        if (count(self::$usedSavepoint) === 0) {
            return;
        }

        $usedSavepoint = array_pop(self::$usedSavepoint);
        $depth = count(self::$usedSavepoint);

        if ($usedSavepoint) {
            $wpdb->query('ROLLBACK TO SAVEPOINT helm_sp_' . $depth);
        } else {
            $wpdb->query('ROLLBACK');
        }
    }

    /**
     * Check if we're currently in a database transaction.
     */
    private static function isInTransaction(): bool
    {
        global $wpdb;

        // @@in_transaction available in MySQL 5.7.2+, MariaDB 10.3+
        $wpdb->suppress_errors(true);
        $result = $wpdb->get_var('SELECT @@in_transaction');
        $wpdb->suppress_errors(false);

        // If variable doesn't exist, assume not in transaction
        if ($result === null) {
            return false;
        }

        return (int) $result === 1;
    }

    /**
     * Execute a callback within a transaction.
     *
     * @template T
     * @param callable(): T $callback
     * @return T
     * @throws \Throwable Re-throws any exception after rollback
     */
    public static function run(callable $callback): mixed
    {
        self::begin();

        try {
            $result = $callback();
            self::commit();
            return $result;
        } catch (\Throwable $e) {
            self::rollback();
            throw $e;
        }
    }

    /**
     * Get current transaction depth (for testing).
     */
    public static function depth(): int
    {
        return count(self::$usedSavepoint);
    }

    /**
     * Reset state (for testing only - use with caution).
     */
    public static function reset(): void
    {
        self::$usedSavepoint = [];
    }
}
