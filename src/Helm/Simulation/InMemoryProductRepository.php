<?php

declare(strict_types=1);

namespace Helm\Simulation;

use Helm\Lib\Date;
use Helm\Products\Contracts\ProductRepository;
use Helm\Products\Models\Product;

/**
 * In-memory product repository for simulation.
 */
final class InMemoryProductRepository implements ProductRepository
{
    /** @var array<int, Product> Indexed by product ID */
    private array $products = [];

    private int $nextId = 1;

    public function find(int $id): ?Product
    {
        return $this->products[$id] ?? null;
    }

    public function findBySlug(string $slug, ?int $version = null): ?Product
    {
        $match = null;

        foreach ($this->products as $product) {
            if ($product->slug !== $slug) {
                continue;
            }

            if ($version !== null && $product->version !== $version) {
                continue;
            }

            // Return latest version when version is null
            if ($match === null || $product->version > $match->version) {
                $match = $product;
            }
        }

        return $match;
    }

    public function findByIds(array $ids): array
    {
        $result = [];

        foreach ($ids as $id) {
            if (isset($this->products[$id])) {
                $result[$id] = $this->products[$id];
            }
        }

        return $result;
    }

    public function findAll(): array
    {
        return array_values($this->products);
    }

    public function findAllByType(string $type): array
    {
        return array_values(array_filter(
            $this->products,
            static fn (Product $p) => $p->type === $type,
        ));
    }

    public function latestVersionOf(string $slug): ?int
    {
        $latest = null;

        foreach ($this->products as $product) {
            if ($product->slug === $slug) {
                if ($latest === null || $product->version > $latest) {
                    $latest = $product->version;
                }
            }
        }

        return $latest;
    }

    public function insert(Product $product): int|false
    {
        $id = $this->nextId++;
        $now = Date::now();

        $product = Product::fromData(array_merge($product->toArray(), [
            'id' => $id,
            'created_at' => $now,
            'updated_at' => $now,
        ]));
        $product->syncOriginal();

        $this->products[$id] = $product;

        return $id;
    }

    public function upsert(array $data): Product
    {
        $slug = $data['slug'] ?? '';
        $version = $data['version'] ?? 1;

        // Check if already exists
        $existing = $this->findBySlug($slug, $version);
        if ($existing !== null) {
            return $existing;
        }

        $product = new Product($data);
        $id = $this->insert($product);

        if ($id === false) {
            throw new \RuntimeException("Failed to insert product: {$slug}");
        }

        return $this->products[$id];
    }
}
