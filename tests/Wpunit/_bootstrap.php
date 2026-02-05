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

// Clean stale data from custom tables left by prior test runs.
// Uses DELETE (DML) instead of TRUNCATE (DDL) to avoid implicit commits.
global $wpdb;
foreach (\Helm\Database\Schema::TABLES as $table) {
    $wpdb->query("DELETE FROM {$wpdb->prefix}{$table}");
}
