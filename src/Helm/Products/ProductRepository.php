<?php

declare(strict_types=1);

namespace Helm\Products;

use DateTimeImmutable;
use Helm\Database\Schema;
use Helm\Lib\Date;
use Helm\Products\Models\Product;
use Helm\StellarWP\Models\Model;

/**
 * Repository for product catalog table operations.
 */
final class ProductRepository
{
    /**
     * Find a product by ID.
     */
    public function find(int $id): ?Product
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_PRODUCTS;

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
     * Find a product by slug, optionally at a specific version.
     *
     * Returns the latest version if version is null.
     */
    public function findBySlug(string $slug, ?int $version = null): ?Product
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_PRODUCTS;

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
     * Find all products.
     *
     * @return array<Product>
     */
    public function findAll(): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_PRODUCTS;

        $rows = $wpdb->get_results(
            "SELECT * FROM {$table} ORDER BY type, slug, version",
            ARRAY_A
        );

        return array_map(
            fn (array $row) => $this->hydrate($row),
            $rows
        );
    }

    /**
     * Find all products of a given type.
     *
     * @return array<Product>
     */
    public function findAllByType(string $type): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_PRODUCTS;

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

        $table = $wpdb->prefix . Schema::TABLE_PRODUCTS;

        $version = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT MAX(version) FROM {$table} WHERE slug = %s",
                $slug
            )
        );

        return $version !== null ? (int) $version : null;
    }

    /**
     * Insert a new product.
     *
     * @return int|false The inserted ID on success, false on failure
     */
    public function insert(Product $product): int|false
    {
        global $wpdb;

        $now = Date::now();
        $product->created_at = $now;
        $product->updated_at = $now;

        $table = $wpdb->prefix . Schema::TABLE_PRODUCTS;
        $row = $this->serialize($product->toArray(), $product);

        $result = $wpdb->insert($table, $row);

        if ($result === false) {
            return false;
        }

        return (int) $wpdb->insert_id;
    }

    /**
     * Upsert a product for seeding.
     *
     * Finds by slug+version, inserts if missing. Returns the product.
     *
     * @param array<string, mixed> $data
     */
    public function upsert(array $data): Product
    {
        $slug = $data['slug'];
        $version = $data['version'] ?? 1;

        $existing = $this->findBySlug($slug, $version);
        if ($existing !== null) {
            return $existing;
        }

        $product = Product::fromData(
            $data,
            Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA
        );
        $id = $this->insert($product);

        if ($id === false) {
            // Insert failed, return the model without ID
            return $product;
        }

        // Refetch to get the full model with ID
        return $this->find($id) ?? $product;
    }

    /**
     * Hydrate a model from a database row.
     *
     * @param array<string, mixed> $row
     */
    private function hydrate(array $row): Product
    {
        $model = Product::fromData(
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
    private function serialize(array $values, Product $model): array
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
