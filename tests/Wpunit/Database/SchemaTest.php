<?php

declare(strict_types=1);

namespace Tests\Wpunit\Database;

use Helm\Database\Schema;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\Database\Schema
 */
class SchemaTest extends WPTestCase
{
    public function test_tables_constant_contains_all_tables(): void
    {
        $this->assertContains(Schema::TABLE_DISCOVERIES, Schema::TABLES);
        $this->assertContains(Schema::TABLE_NAV_NODES, Schema::TABLES);
        $this->assertContains(Schema::TABLE_NAV_EDGES, Schema::TABLES);
        $this->assertContains(Schema::TABLE_NAV_ROUTES, Schema::TABLES);
    }

    public function test_table_returns_prefixed_name(): void
    {
        global $wpdb;

        $result = Schema::table(Schema::TABLE_DISCOVERIES);

        $this->assertSame($wpdb->prefix . 'helm_discoveries', $result);
    }

    public function test_tables_exist_returns_true_when_tables_exist(): void
    {
        // Tables should exist after plugin activation
        Schema::createTables();

        $this->assertTrue(Schema::tablesExist());
    }

    public function test_create_tables_returns_true_on_success(): void
    {
        $result = Schema::createTables();

        $this->assertTrue($result);
    }

    public function test_create_tables_is_idempotent(): void
    {
        // Running twice should not cause errors
        $result1 = Schema::createTables();
        $result2 = Schema::createTables();

        $this->assertTrue($result1);
        $this->assertTrue($result2);
    }

    public function test_version_constant_is_positive_integer(): void
    {
        $this->assertIsInt(Schema::VERSION);
        $this->assertGreaterThan(0, Schema::VERSION);
    }

    public function test_get_stored_version_returns_integer(): void
    {
        Schema::createTables(); // This stores the version

        $version = Schema::getStoredVersion();

        $this->assertIsInt($version);
    }

    public function test_needs_upgrade_returns_false_when_current(): void
    {
        Schema::createTables(); // This sets version to current

        $this->assertFalse(Schema::needsUpgrade());
    }

    public function test_tables_created_have_correct_structure(): void
    {
        global $wpdb;

        Schema::createTables();

        // Check nav_nodes table has expected columns
        $columns = $wpdb->get_col(
            $wpdb->prepare(
                "SHOW COLUMNS FROM %i",
                Schema::table(Schema::TABLE_NAV_NODES)
            )
        );

        $this->assertContains('id', $columns);
        $this->assertContains('type', $columns);
        $this->assertContains('x', $columns);
        $this->assertContains('y', $columns);
        $this->assertContains('z', $columns);
        $this->assertContains('hash', $columns);
        $this->assertContains('algorithm_version', $columns);
    }

    public function test_nav_edges_table_has_correct_structure(): void
    {
        global $wpdb;

        Schema::createTables();

        $columns = $wpdb->get_col(
            $wpdb->prepare(
                "SHOW COLUMNS FROM %i",
                Schema::table(Schema::TABLE_NAV_EDGES)
            )
        );

        $this->assertContains('id', $columns);
        $this->assertContains('node_a_id', $columns);
        $this->assertContains('node_b_id', $columns);
        $this->assertContains('distance', $columns);
        $this->assertContains('discovered_by_ship_id', $columns);
        $this->assertContains('traversal_count', $columns);
    }

    public function test_nav_routes_table_has_correct_structure(): void
    {
        global $wpdb;

        Schema::createTables();

        $columns = $wpdb->get_col(
            $wpdb->prepare(
                "SHOW COLUMNS FROM %i",
                Schema::table(Schema::TABLE_NAV_ROUTES)
            )
        );

        $this->assertContains('id', $columns);
        $this->assertContains('start_node_id', $columns);
        $this->assertContains('end_node_id', $columns);
        $this->assertContains('path', $columns);
        $this->assertContains('total_distance', $columns);
        $this->assertContains('jump_count', $columns);
        $this->assertContains('visibility', $columns);
        $this->assertContains('traversal_count', $columns);
    }

    public function test_discoveries_table_has_correct_structure(): void
    {
        global $wpdb;

        Schema::createTables();

        $columns = $wpdb->get_col(
            $wpdb->prepare(
                "SHOW COLUMNS FROM %i",
                Schema::table(Schema::TABLE_DISCOVERIES)
            )
        );

        $this->assertContains('id', $columns);
        $this->assertContains('star_id', $columns);
        $this->assertContains('ship_id', $columns);
        $this->assertContains('contents_hash', $columns);
        $this->assertContains('is_first', $columns);
        $this->assertContains('discovered_at', $columns);
    }
}
