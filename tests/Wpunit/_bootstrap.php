<?php

declare(strict_types=1);

// Wpunit suite bootstrap file.
//
// IMPORTANT: Avoid DDL (CREATE TABLE, TRUNCATE, ALTER) here.
// DDL causes implicit commits in MySQL, which can break WPLoader's
// transaction-based test isolation.
//
// Tables are created by Schema::createTables() during plugin activation
// or by slic's setup. If tables are missing, run: slic run setup

// Ensure all tables exist (e.g. after environment restart or schema change).
// Schema::createTables() uses dbDelta which is idempotent.
if (\Helm\Database\Schema::needsUpgrade() || !\Helm\Database\Schema::tablesExist()) {
    // Drop and recreate tables for major schema changes (dbDelta can't remove columns)
    \Helm\Database\Schema::dropTables();
    \Helm\Database\Schema::createTables();
}

// Clean stale data from custom tables left by prior test runs.
// Uses DELETE (DML) instead of TRUNCATE (DDL) to avoid implicit commits.
global $wpdb;
foreach (\Helm\Database\Schema::TABLES as $table) {
    $wpdb->query("DELETE FROM {$wpdb->prefix}{$table}");
}

// Re-seed products so they're available for all tests.
// Must run after cleanup since DELETE removes seeded rows.
$seeder = new \Helm\Products\ProductSeeder(
    new \Helm\Products\WpdbProductRepository()
);
$seeder->seed();
