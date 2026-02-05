<?php

declare(strict_types=1);

namespace Helm\Database;

/**
 * Centralized database schema management.
 *
 * All custom tables for the Helm plugin are defined here.
 * Uses WordPress dbDelta for idempotent table creation/updates.
 *
 * @see https://developer.wordpress.org/reference/functions/dbdelta/
 */
final class Schema
{
    // Table name constants (without prefix)
    public const TABLE_DISCOVERIES = 'helm_discoveries';
    public const TABLE_NAV_NODES = 'helm_nav_nodes';
    public const TABLE_NAV_EDGES = 'helm_nav_edges';
    public const TABLE_NAV_ROUTES = 'helm_nav_routes';
    public const TABLE_SHIP_SYSTEMS = 'helm_ship_systems';
    public const TABLE_SHIP_ACTIONS = 'helm_ship_actions';

    /**
     * All custom tables (without prefix).
     */
    public const TABLES = [
        self::TABLE_DISCOVERIES,
        self::TABLE_NAV_NODES,
        self::TABLE_NAV_EDGES,
        self::TABLE_NAV_ROUTES,
        self::TABLE_SHIP_SYSTEMS,
        self::TABLE_SHIP_ACTIONS,
    ];

    /**
     * Current schema version.
     * Increment when making schema changes.
     */
    public const VERSION = 1;

    /**
     * Option key for stored schema version.
     */
    private const VERSION_OPTION = 'helm_schema_version';

    /**
     * Create or update all database tables.
     *
     * @return bool|\WP_Error True on success, \WP_Error on failure.
     */
    public static function createTables(): bool|\WP_Error
    {
        global $wpdb;

        $charsetCollate = $wpdb->get_charset_collate();
        $prefix = $wpdb->prefix;

        // Build all CREATE TABLE statements
        $sql = self::getDiscoveriesTableSql($prefix, $charsetCollate)
             . self::getNavNodesTableSql($prefix, $charsetCollate)
             . self::getNavEdgesTableSql($prefix, $charsetCollate)
             . self::getNavRoutesTableSql($prefix, $charsetCollate)
             . self::getShipSystemsTableSql($prefix, $charsetCollate)
             . self::getShipActionsTableSql($prefix, $charsetCollate);

        // Run dbDelta with error handling
        $wpError = self::dbDeltaWithErrorHandling($sql);

        // Verify all tables exist
        foreach (self::TABLES as $table) {
            $fullTableName = $prefix . $table;
            $exists = $wpdb->get_var(
                $wpdb->prepare('SHOW TABLES LIKE %s', $fullTableName)
            );

            if ($exists !== $fullTableName) {
                $wpError->add(
                    'missing_table',
                    sprintf('The %s table was not created.', $table)
                );
            }
        }

        if ($wpError->has_errors()) {
            return $wpError;
        }

        // Store schema version
        update_option(self::VERSION_OPTION, self::VERSION);

        return true;
    }

    /**
     * Drop all database tables.
     *
     * Use with caution - this destroys data.
     */
    public static function dropTables(): void
    {
        global $wpdb;

        // Drop in reverse order to handle foreign key constraints
        $tables = array_reverse(self::TABLES);

        foreach ($tables as $table) {
            $wpdb->query("DROP TABLE IF EXISTS {$wpdb->prefix}{$table}");
        }

        delete_option(self::VERSION_OPTION);
    }

    /**
     * Check if all tables exist.
     */
    public static function tablesExist(): bool
    {
        global $wpdb;

        foreach (self::TABLES as $table) {
            $fullTableName = $wpdb->prefix . $table;
            $exists = $wpdb->get_var(
                $wpdb->prepare('SHOW TABLES LIKE %s', $fullTableName)
            );

            if ($exists !== $fullTableName) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get the current stored schema version.
     */
    public static function getStoredVersion(): int
    {
        return (int) get_option(self::VERSION_OPTION, 0);
    }

    /**
     * Check if schema needs upgrade.
     */
    public static function needsUpgrade(): bool
    {
        return self::getStoredVersion() < self::VERSION;
    }

    /**
     * Get full table name with prefix.
     */
    public static function table(string $name): string
    {
        global $wpdb;
        return $wpdb->prefix . $name;
    }

    /**
     * Run dbDelta with error handling.
     *
     * Based on iThemes Security Pro's pattern.
     */
    private static function dbDeltaWithErrorHandling(string $sql): \WP_Error
    {
        global $wpdb, $EZSQL_ERROR;

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        $errorCount = is_array($EZSQL_ERROR) ? count($EZSQL_ERROR) : 0;
        $showedErrors = $wpdb->show_errors(false);

        dbDelta($sql);

        if ($showedErrors) {
            $wpdb->show_errors();
        }

        $wpError = new \WP_Error();

        if (is_array($EZSQL_ERROR)) {
            for ($i = $errorCount, $max = count($EZSQL_ERROR); $i < $max; $i++) {
                $error = $EZSQL_ERROR[$i];

                // Filter out DESCRIBE queries (used by dbDelta to check schema)
                if (
                    ($error['error_str'] ?? '') === ''
                    || ($error['query'] ?? '') === ''
                    || str_starts_with($error['query'], 'DESCRIBE ')
                ) {
                    continue;
                }

                $wpError->add('db_delta_error', $error['error_str']);
            }
        }

        return $wpError;
    }

    /**
     * Discoveries table SQL.
     */
    private static function getDiscoveriesTableSql(string $prefix, string $charsetCollate): string
    {
        return "
CREATE TABLE {$prefix}helm_discoveries (
    id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    star_id varchar(64) NOT NULL,
    ship_id varchar(64) NOT NULL,
    contents_hash varchar(64) NOT NULL,
    is_first tinyint(1) NOT NULL DEFAULT 0,
    discovered_at int(10) unsigned NOT NULL,
    PRIMARY KEY  (id),
    KEY star_id (star_id),
    KEY ship_id (ship_id),
    KEY is_first (is_first)
) {$charsetCollate};
";
    }

    /**
     * Navigation nodes table SQL.
     */
    private static function getNavNodesTableSql(string $prefix, string $charsetCollate): string
    {
        return "
CREATE TABLE {$prefix}helm_nav_nodes (
    id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    star_post_id bigint(20) unsigned DEFAULT NULL,
    x double NOT NULL,
    y double NOT NULL,
    z double NOT NULL,
    hash varchar(64) DEFAULT NULL,
    algorithm_version smallint(5) unsigned NOT NULL DEFAULT 1,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (id),
    UNIQUE KEY star_post_id (star_post_id),
    UNIQUE KEY hash (hash),
    KEY coords (x,y,z)
) {$charsetCollate};
";
    }

    /**
     * Navigation edges table SQL.
     */
    private static function getNavEdgesTableSql(string $prefix, string $charsetCollate): string
    {
        return "
CREATE TABLE {$prefix}helm_nav_edges (
    id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    node_a_id bigint(20) unsigned NOT NULL,
    node_b_id bigint(20) unsigned NOT NULL,
    distance double NOT NULL,
    discovered_by_ship_id varchar(50) DEFAULT NULL,
    traversal_count int(10) unsigned NOT NULL DEFAULT 0,
    algorithm_version smallint(5) unsigned NOT NULL DEFAULT 1,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (id),
    UNIQUE KEY node_pair (node_a_id,node_b_id),
    KEY node_a_id (node_a_id),
    KEY node_b_id (node_b_id),
    KEY traversal_count (traversal_count)
) {$charsetCollate};
";
    }

    /**
     * Navigation routes table SQL.
     */
    private static function getNavRoutesTableSql(string $prefix, string $charsetCollate): string
    {
        return "
CREATE TABLE {$prefix}helm_nav_routes (
    id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    name varchar(255) DEFAULT NULL,
    start_node_id bigint(20) unsigned NOT NULL,
    end_node_id bigint(20) unsigned NOT NULL,
    path longtext NOT NULL,
    total_distance double NOT NULL,
    jump_count smallint(5) unsigned NOT NULL,
    discovered_by_ship_id varchar(50) NOT NULL,
    traversal_count int(10) unsigned NOT NULL DEFAULT 1,
    visibility varchar(20) NOT NULL DEFAULT 'private',
    algorithm_version smallint(5) unsigned NOT NULL DEFAULT 1,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (id),
    KEY start_end (start_node_id,end_node_id),
    KEY visibility (visibility),
    KEY discovered_by_ship_id (discovered_by_ship_id)
) {$charsetCollate};
";
    }

    /**
     * Ship systems state table SQL.
     *
     * Stores rapidly-changing ship state separately from the Ship CPT.
     * Component configuration stays in post meta; operational state lives here.
     * Credits are stored on the user, not the ship.
     *
     * Regenerating resources (power, shields) use "full_at" timestamps -
     * current value is calculated from time remaining until full.
     */
    private static function getShipSystemsTableSql(string $prefix, string $charsetCollate): string
    {
        return "
CREATE TABLE {$prefix}helm_ship_systems (
    ship_post_id bigint(20) unsigned NOT NULL,
    core_type smallint(5) unsigned NOT NULL DEFAULT 1,
    drive_type smallint(5) unsigned NOT NULL DEFAULT 1,
    sensor_type smallint(5) unsigned NOT NULL DEFAULT 1,
    shield_type smallint(5) unsigned NOT NULL DEFAULT 1,
    nav_tier smallint(5) unsigned NOT NULL DEFAULT 1,
    power_mode smallint(5) unsigned NOT NULL DEFAULT 2,
    power_full_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    power_max float NOT NULL DEFAULT 100.0,
    shields_full_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    shields_max float NOT NULL DEFAULT 100.0,
    core_life float NOT NULL DEFAULT 750.0,
    hull_integrity float NOT NULL DEFAULT 100.0,
    hull_max float NOT NULL DEFAULT 100.0,
    node_id bigint(20) unsigned DEFAULT NULL,
    cargo longtext DEFAULT NULL,
    current_action_id bigint(20) unsigned DEFAULT NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY  (ship_post_id),
    KEY node_id (node_id),
    KEY core_life (core_life),
    KEY current_action_id (current_action_id)
) {$charsetCollate};
";
    }

    /**
     * Ship actions table SQL.
     *
     * Tracks queued, running, and completed ship actions.
     *
     * Status values:
     * - pending: queued, waiting to start
     * - running: currently being processed
     * - fulfilled: completed successfully
     * - partial: completed with partial results
     * - failed: completed with error
     *
     * Queue columns:
     * - deferred_until: when action becomes ready for processing
     * - processing_at: timestamp lock for concurrent workers (NULL = available)
     * - attempts: retry counter for failed processing attempts
     */
    private static function getShipActionsTableSql(string $prefix, string $charsetCollate): string
    {
        return "
CREATE TABLE {$prefix}helm_ship_actions (
    id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    ship_post_id bigint(20) unsigned NOT NULL,
    action_type varchar(32) NOT NULL,
    params JSON DEFAULT NULL,
    status varchar(16) NOT NULL DEFAULT 'pending',
    deferred_until datetime DEFAULT NULL,
    processing_at datetime DEFAULT NULL,
    attempts tinyint(3) unsigned NOT NULL DEFAULT 0,
    result JSON DEFAULT NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY  (id),
    KEY ship_post_id (ship_post_id),
    KEY ship_status (ship_post_id,status),
    KEY idx_ready (status,deferred_until,processing_at)
) {$charsetCollate};
";
    }
}
