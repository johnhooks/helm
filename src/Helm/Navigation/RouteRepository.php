<?php

declare(strict_types=1);

namespace Helm\Navigation;

use Helm\Database\Schema;

/**
 * Repository for saved routes.
 */
final class RouteRepository
{
    /**
     * Find a route by ID.
     */
    public function get(int $id): ?Route
    {
        global $wpdb;

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE id = %d",
                Schema::table(Schema::TABLE_NAV_ROUTES),
                $id
            ),
            ARRAY_A
        );

        return $row ? Route::fromRow($row) : null;
    }

    /**
     * Find routes between two star nodes.
     *
     * @return Route[]
     */
    public function between(int $startNodeId, int $endNodeId): array
    {
        global $wpdb;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE start_node_id = %d AND end_node_id = %d ORDER BY total_distance",
                Schema::table(Schema::TABLE_NAV_ROUTES),
                $startNodeId,
                $endNodeId
            ),
            ARRAY_A
        );

        return array_map(fn($row) => Route::fromRow($row), $rows);
    }

    /**
     * Find the shortest route between two stars.
     */
    public function shortestBetween(int $startNodeId, int $endNodeId): ?Route
    {
        $routes = $this->between($startNodeId, $endNodeId);
        return $routes[0] ?? null;
    }

    /**
     * Find all routes discovered by a ship.
     *
     * @return Route[]
     */
    public function discoveredBy(string $shipId): array
    {
        global $wpdb;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE discovered_by_ship_id = %s ORDER BY created_at DESC",
                Schema::table(Schema::TABLE_NAV_ROUTES),
                $shipId
            ),
            ARRAY_A
        );

        return array_map(fn($row) => Route::fromRow($row), $rows);
    }

    /**
     * Find all public routes.
     *
     * @return Route[]
     */
    public function publicRoutes(): array
    {
        global $wpdb;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE visibility = %s ORDER BY traversal_count DESC",
                Schema::table(Schema::TABLE_NAV_ROUTES),
                Route::VISIBILITY_PUBLIC
            ),
            ARRAY_A
        );

        return array_map(fn($row) => Route::fromRow($row), $rows);
    }

    /**
     * Find routes from a specific star.
     *
     * @return Route[]
     */
    public function fromStar(int $startNodeId): array
    {
        global $wpdb;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE start_node_id = %d ORDER BY end_node_id",
                Schema::table(Schema::TABLE_NAV_ROUTES),
                $startNodeId
            ),
            ARRAY_A
        );

        return array_map(fn($row) => Route::fromRow($row), $rows);
    }

    /**
     * Find routes accessible by a ship (discovered by them OR public).
     *
     * @return Route[]
     */
    public function accessibleBy(string $shipId): array
    {
        global $wpdb;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE discovered_by_ship_id = %s OR visibility = %s ORDER BY total_distance",
                Schema::table(Schema::TABLE_NAV_ROUTES),
                $shipId,
                Route::VISIBILITY_PUBLIC
            ),
            ARRAY_A
        );

        return array_map(fn($row) => Route::fromRow($row), $rows);
    }

    /**
     * Save a route (insert or update).
     */
    public function save(Route $route): Route
    {
        global $wpdb;

        $data = $route->toRow();
        $table = Schema::table(Schema::TABLE_NAV_ROUTES);

        if ($route->id === 0) {
            $wpdb->insert($table, $data);
            $id = (int) $wpdb->insert_id;
        } else {
            $wpdb->update($table, $data, ['id' => $route->id]);
            $id = $route->id;
        }

        return $this->get($id);
    }

    /**
     * Increment traversal count for a route.
     */
    public function incrementTraversal(int $routeId): void
    {
        global $wpdb;

        $wpdb->query(
            $wpdb->prepare(
                "UPDATE %i SET traversal_count = traversal_count + 1 WHERE id = %d",
                Schema::table(Schema::TABLE_NAV_ROUTES),
                $routeId
            )
        );

        // Check if route should become public
        $route = $this->get($routeId);
        if ($route && $route->shouldBecomePublic()) {
            $this->makePublic($routeId);
        }
    }

    /**
     * Make a route public.
     */
    public function makePublic(int $routeId): void
    {
        global $wpdb;

        $wpdb->update(
            Schema::table(Schema::TABLE_NAV_ROUTES),
            ['visibility' => Route::VISIBILITY_PUBLIC],
            ['id' => $routeId]
        );
    }

    /**
     * Delete a route by ID.
     */
    public function delete(int $id): bool
    {
        global $wpdb;

        $result = $wpdb->delete(
            Schema::table(Schema::TABLE_NAV_ROUTES),
            ['id' => $id],
            ['%d']
        );

        return $result !== false;
    }

    /**
     * Count all routes.
     */
    public function count(): int
    {
        global $wpdb;

        return (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM %i",
                Schema::table(Schema::TABLE_NAV_ROUTES)
            )
        );
    }

    /**
     * Count public routes.
     */
    public function countPublic(): int
    {
        global $wpdb;

        return (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM %i WHERE visibility = %s",
                Schema::table(Schema::TABLE_NAV_ROUTES),
                Route::VISIBILITY_PUBLIC
            )
        );
    }
}
