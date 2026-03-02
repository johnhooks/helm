<?php

declare(strict_types=1);

namespace Helm\Products\Contracts;

use Helm\Products\Models\Product;

/**
 * Repository contract for product catalog operations.
 */
interface ProductRepository
{
    /**
     * Find a product by ID.
     *
     * @param int $id
     * @return Product|null
     */
    public function find(int $id): ?Product;

    /**
     * Find a product by slug, optionally at a specific version.
     *
     * Returns the latest version if version is null.
     *
     * @param string $slug
     * @param int|null $version
     * @return Product|null
     */
    public function findBySlug(string $slug, ?int $version = null): ?Product;

    /**
     * Find multiple products by ID.
     *
     * @param array<int> $ids
     * @return array<int, Product> Indexed by product ID
     */
    public function findByIds(array $ids): array;

    /**
     * Find all products.
     *
     * @return array<Product>
     */
    public function findAll(): array;

    /**
     * Find all products of a given type.
     *
     * @param string $type
     * @return array<Product>
     */
    public function findAllByType(string $type): array;

    /**
     * Get the latest version number for a slug.
     *
     * @param string $slug
     * @return int|null
     */
    public function latestVersionOf(string $slug): ?int;

    /**
     * Insert a new product.
     *
     * @param Product $product
     * @return int|false The inserted ID on success, false on failure
     */
    public function insert(Product $product): int|false;

    /**
     * Upsert a product for seeding.
     *
     * Finds by slug+version, inserts if missing. Returns the product.
     *
     * @param array<string, mixed> $data
     * @return Product
     */
    public function upsert(array $data): Product;
}
