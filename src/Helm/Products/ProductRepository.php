<?php

declare(strict_types=1);

namespace Helm\Products;

use Helm\Database\Schema;
use Helm\Lib\Date;
use Helm\Lib\HydratesModels;
use Helm\Products\Models\Product;
use Helm\StellarWP\Models\Model;

/**
 * Repository for product catalog table operations.
 */
final class ProductRepository
{
    use HydratesModels;

    private const CACHE_GROUP = 'helm_products';

    /**
     * Find a product by ID.
     */
    public function find(int $id): ?Product
    {
        /** @var array<string, mixed>|false $cached */
        $cached = wp_cache_get($id, self::CACHE_GROUP);

        if (is_array($cached)) {
            return $this->hydrate($cached);
        }

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

        wp_cache_set($id, $row, self::CACHE_GROUP);

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
     * Find multiple products by ID.
     *
     * Primes the wp_cache identity map so subsequent find() calls avoid DB queries.
     *
     * @param array<int> $ids
     * @return array<int, Product> Indexed by product ID
     */
    public function findByIds(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        $products = [];

        // Collect cached rows and determine which IDs need fetching.
        $uncachedIds = _get_non_cached_ids($ids, self::CACHE_GROUP);

        foreach ($ids as $id) {
            if (in_array($id, $uncachedIds, true)) {
                continue;
            }

            /** @var array<string, mixed>|false $cached */
            $cached = wp_cache_get($id, self::CACHE_GROUP);

            if (is_array($cached)) {
                $products[$id] = $this->hydrate($cached);
            }
        }

        // Batch-query only the missing IDs.
        if ($uncachedIds !== []) {
            global $wpdb;

            $table = $wpdb->prefix . Schema::TABLE_PRODUCTS;
            $placeholders = implode(',', array_fill(0, count($uncachedIds), '%d'));

            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT * FROM {$table} WHERE id IN ({$placeholders})",
                    ...$uncachedIds
                ),
                ARRAY_A
            );

            foreach ($rows as $row) {
                wp_cache_set((int) $row['id'], $row, self::CACHE_GROUP);
                $product = $this->hydrate($row);
                $products[$product->id] = $product;
            }
        }

        return $products;
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
        $row = $this->serializeToDbRow($product->toArray(), $product);

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
        /** @var Product */
        return $this->hydrateModel(Product::class, $row);
    }
}
