<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use DateTimeImmutable;
use Helm\Database\Schema;
use Helm\Lib\Date;
use Helm\ShipLink\Models\SystemType;
use Helm\StellarWP\Models\Model;

/**
 * Repository for system type catalog table operations.
 */
final class SystemTypeRepository
{
    /**
     * Find a system type by ID.
     */
    public function find(int $id): ?SystemType
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SYSTEM_TYPES;

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE id = %d",
                $id
            ),
            ARRAY_A
        );

        if ($row === null) {
            return null;
        }

        return $this->hydrate($row);
    }

    /**
     * Find a system type by slug, optionally at a specific version.
     *
     * Returns the latest version if version is null.
     */
    public function findBySlug(string $slug, ?int $version = null): ?SystemType
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SYSTEM_TYPES;

        if ($version !== null) {
            $row = $wpdb->get_row(
                $wpdb->prepare(
                    "SELECT * FROM {$table} WHERE slug = %s AND version = %d",
                    $slug,
                    $version
                ),
                ARRAY_A
            );
        } else {
            $row = $wpdb->get_row(
                $wpdb->prepare(
                    "SELECT * FROM {$table} WHERE slug = %s ORDER BY version DESC LIMIT 1",
                    $slug
                ),
                ARRAY_A
            );
        }

        if ($row === null) {
            return null;
        }

        return $this->hydrate($row);
    }

    /**
     * Find all system types of a given type.
     *
     * @return array<SystemType>
     */
    public function findAllByType(string $type): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SYSTEM_TYPES;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE type = %s ORDER BY slug, version",
                $type
            ),
            ARRAY_A
        );

        return array_map(
            fn (array $row) => $this->hydrate($row),
            $rows
        );
    }

    /**
     * Get the latest version number for a slug.
     */
    public function latestVersionOf(string $slug): ?int
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SYSTEM_TYPES;

        $version = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT MAX(version) FROM {$table} WHERE slug = %s",
                $slug
            )
        );

        return $version !== null ? (int) $version : null;
    }

    /**
     * Insert a new system type.
     *
     * @return int|false The inserted ID on success, false on failure
     */
    public function insert(SystemType $type): int|false
    {
        global $wpdb;

        $now = Date::now();
        $type->created_at = $now;
        $type->updated_at = $now;

        $table = $wpdb->prefix . Schema::TABLE_SYSTEM_TYPES;
        $row = $this->serialize($type->toArray(), $type);

        $result = $wpdb->insert($table, $row);

        if ($result === false) {
            return false;
        }

        return (int) $wpdb->insert_id;
    }

    /**
     * Upsert a system type for seeding.
     *
     * Finds by slug+version, inserts if missing. Returns the system type.
     *
     * @param array<string, mixed> $data
     */
    public function upsert(array $data): SystemType
    {
        $slug = $data['slug'];
        $version = $data['version'] ?? 1;

        $existing = $this->findBySlug($slug, $version);
        if ($existing !== null) {
            return $existing;
        }

        $type = SystemType::fromData(
            $data,
            Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA
        );
        $id = $this->insert($type);

        if ($id === false) {
            // Insert failed, return the model without ID
            return $type;
        }

        // Refetch to get the full model with ID
        return $this->find($id) ?? $type;
    }

    /**
     * Hydrate a model from a database row.
     *
     * @param array<string, mixed> $row
     */
    private function hydrate(array $row): SystemType
    {
        $model = SystemType::fromData(
            $row,
            Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA
        );
        $model->syncOriginal();

        return $model;
    }

    /**
     * Serialize model values for database storage.
     *
     * @param array<string, mixed> $values
     * @return array<string, mixed>
     */
    private function serialize(array $values, SystemType $model): array
    {
        $row = [];

        foreach ($values as $key => $value) {
            if ($key === 'id' || !$model->isSet($key)) {
                continue;
            }

            $row[$key] = match (true) {
                $value instanceof DateTimeImmutable => $value->format('Y-m-d H:i:s'),
                default => $value,
            };
        }

        return $row;
    }
}
