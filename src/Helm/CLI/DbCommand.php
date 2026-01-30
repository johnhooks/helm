<?php

declare(strict_types=1);

namespace Helm\CLI;

use Helm\Database\Schema;
use WP_CLI;

/**
 * Database management commands.
 */
class DbCommand
{
    /**
     * Run database migrations.
     *
     * Creates or updates all Helm database tables.
     *
     * ## EXAMPLES
     *
     *     wp helm db migrate
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function migrate(array $args, array $assoc_args): void
    {
        WP_CLI::log('Running database migrations...');

        $result = Schema::createTables();

        if (is_wp_error($result)) {
            WP_CLI::error(sprintf(
                'Migration failed: %s',
                implode(', ', $result->get_error_messages())
            ));
        }

        WP_CLI::success(sprintf(
            'Database migrated successfully. Schema version: %d',
            Schema::getStoredVersion()
        ));

        // Show table status
        WP_CLI::log('');
        WP_CLI::log('Tables:');
        foreach (Schema::TABLES as $table) {
            WP_CLI::log(sprintf('  - %s', $table));
        }
    }

    /**
     * Show database status.
     *
     * ## EXAMPLES
     *
     *     wp helm db status
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function status(array $args, array $assoc_args): void
    {
        global $wpdb;

        WP_CLI::log('');
        WP_CLI::log('=== Helm Database Status ===');
        WP_CLI::log('');
        WP_CLI::log(sprintf('  Schema Version:  %d (current: %d)', Schema::getStoredVersion(), Schema::VERSION));
        WP_CLI::log(sprintf('  Needs Upgrade:   %s', Schema::needsUpgrade() ? 'Yes' : 'No'));
        WP_CLI::log(sprintf('  Tables Exist:    %s', Schema::tablesExist() ? 'Yes' : 'No'));
        WP_CLI::log('');

        WP_CLI::log('Tables:');
        foreach (Schema::TABLES as $table) {
            $fullName = $wpdb->prefix . $table;
            $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $fullName)) === $fullName;
            $status = $exists ? WP_CLI::colorize('%GEXISTS%n') : WP_CLI::colorize('%RMISSING%n');
            WP_CLI::log(sprintf('  %-30s %s', $table, $status));
        }
        WP_CLI::log('');
    }

    /**
     * Drop all Helm database tables.
     *
     * WARNING: This is destructive and cannot be undone!
     *
     * ## OPTIONS
     *
     * [--yes]
     * : Skip confirmation prompt.
     *
     * ## EXAMPLES
     *
     *     wp helm db drop --yes
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function drop(array $args, array $assoc_args): void
    {
        if (! isset($assoc_args['yes'])) {
            WP_CLI::confirm('This will DELETE ALL Helm database tables and their data. Are you sure?');
        }

        WP_CLI::log('Dropping tables...');
        Schema::dropTables();
        WP_CLI::success('All Helm tables dropped.');
    }
}
