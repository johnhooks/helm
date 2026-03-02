<?php

declare(strict_types=1);

namespace Helm\Products;

use Helm\Products\Contracts\ProductRepository;

/**
 * Seeds the products table from JSON data files.
 *
 * Reads all JSON files from data/products/ and upserts into
 * helm_products. Idempotent - safe to run on every activation.
 */
final class ProductSeeder
{
    public function __construct(
        private readonly ProductRepository $repository,
    ) {
    }

    /**
     * Seed all products from JSON files.
     *
     * @return int Number of products seeded (inserted, not counting existing)
     */
    public function seed(): int
    {
        $dataDir = dirname(__DIR__, 3) . '/data/products';

        if (!is_dir($dataDir)) {
            return 0;
        }

        $count = 0;
        $files = glob($dataDir . '/*.json');

        if ($files === false) {
            return 0;
        }

        foreach ($files as $file) {
            $json = file_get_contents($file);
            if ($json === false) {
                continue;
            }

            $decoded = json_decode($json, true);
            if (!is_array($decoded)) {
                continue;
            }

            // Support both formats:
            // - Plain array: [{slug: ...}, ...]
            // - Schema-wrapped object: {$schema: ..., items: [{slug: ...}, ...]}
            $items = isset($decoded['items']) && is_array($decoded['items'])
                ? $decoded['items']
                : $decoded;

            foreach ($items as $item) {
                if (!is_array($item) || !isset($item['slug'])) {
                    continue;
                }

                $this->repository->upsert($item);
                $count++;
            }
        }

        return $count;
    }
}
