<?php

declare(strict_types=1);

namespace Helm\CLI;

use Helm\Products\Contracts\ProductRepository;
use Helm\Products\ProductSeeder;
use WP_CLI;

/**
 * Product catalog commands.
 */
class ProductCommand
{
    public function __construct(
        private readonly ProductSeeder $seeder,
        private readonly ProductRepository $repository,
    ) {
    }

    /**
     * Seed the product catalog from data/products/*.json.
     *
     * Idempotent — upserts by slug+version, safe to re-run.
     *
     * ## EXAMPLES
     *
     *     wp helm product seed
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function seed(array $args, array $assoc_args): void
    {
        WP_CLI::log('Seeding products from data/products/...');

        $count = $this->seeder->seed();

        WP_CLI::success(sprintf(
            'Seeded %d product record(s). Catalog now has %d product(s).',
            $count,
            count($this->repository->findAll())
        ));
    }
}
