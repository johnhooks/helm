<?php

declare(strict_types=1);

namespace Tests\Wpunit\Products;

use Helm\Products\ProductRepository;
use Helm\Products\ProductSeeder;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\Products\ProductSeeder
 */
class ProductSeederTest extends WPTestCase
{
    private ProductSeeder $seeder;
    private ProductRepository $repository;

    public function _before(): void
    {
        parent::_before();
        $this->repository = helm(ProductRepository::class);
        $this->seeder = new ProductSeeder($this->repository);
    }

    public function test_seed_returns_count(): void
    {
        // Bootstrap already seeds, so running again should return 0 (all exist)
        $count = $this->seeder->seed();

        // Seeder returns total items processed, not just new inserts
        // With 5 data files: 3 cores + 3 drives + 3 sensors + 3 shields + 5 navs = 17
        $this->assertSame(17, $count);
    }

    public function test_seed_is_idempotent(): void
    {
        // Run seed twice
        $firstCount = $this->seeder->seed();
        $secondCount = $this->seeder->seed();

        // Both should process the same number of items
        $this->assertSame($firstCount, $secondCount);

        // Verify no duplicates - each slug should have exactly one version 1
        $cores = $this->repository->findAllByType('core');
        $slugs = array_map(fn ($t) => $t->slug, $cores);
        $uniqueSlugs = array_unique($slugs);

        $this->assertCount(count($uniqueSlugs), $slugs, 'Duplicate slugs found');
    }

    public function test_seeded_products_have_correct_data(): void
    {
        $this->seeder->seed();

        // Verify a core product
        $epochS = $this->repository->findBySlug('epoch_s');
        $this->assertNotNull($epochS);
        $this->assertSame('core', $epochS->type);
        $this->assertSame('Epoch-S Standard', $epochS->label);
        $this->assertSame(750, $epochS->hp);
        $this->assertSame(25, $epochS->footprint);
        $this->assertSame(10.0, $epochS->rate);
        $this->assertSame(1.0, $epochS->mult_a);
        $this->assertSame(1.0, $epochS->mult_b);

        // Verify a drive product
        $dr505 = $this->repository->findBySlug('dr_505');
        $this->assertNotNull($dr505);
        $this->assertSame('drive', $dr505->type);
        $this->assertSame(7.0, $dr505->range);
        $this->assertSame(1.0, $dr505->mult_a);
        $this->assertSame(1.0, $dr505->mult_b);
        $this->assertSame(1.0, $dr505->mult_c);

        // Verify a sensor product
        $vrs = $this->repository->findBySlug('vrs_mk1');
        $this->assertNotNull($vrs);
        $this->assertSame('sensor', $vrs->type);
        $this->assertSame(5.0, $vrs->range);
        $this->assertSame(0.7, $vrs->chance);

        // Verify a shield product
        $aegisBeta = $this->repository->findBySlug('aegis_beta');
        $this->assertNotNull($aegisBeta);
        $this->assertSame('shield', $aegisBeta->type);
        $this->assertSame(10.0, $aegisBeta->rate);
        $this->assertSame(100.0, $aegisBeta->capacity);

        // Verify a nav product
        $navTier1 = $this->repository->findBySlug('nav_tier_1');
        $this->assertNotNull($navTier1);
        $this->assertSame('nav', $navTier1->type);
        $this->assertSame(0.3, $navTier1->mult_a);
        $this->assertSame(0.5, $navTier1->mult_b);
    }

    public function test_all_component_types_seeded(): void
    {
        $this->seeder->seed();

        // Verify all types have at least one entry
        $this->assertNotEmpty($this->repository->findAllByType('core'));
        $this->assertNotEmpty($this->repository->findAllByType('drive'));
        $this->assertNotEmpty($this->repository->findAllByType('sensor'));
        $this->assertNotEmpty($this->repository->findAllByType('shield'));
        $this->assertNotEmpty($this->repository->findAllByType('nav'));
    }

    public function test_seed_counts_by_type(): void
    {
        $this->seeder->seed();

        // Verify expected counts per type
        $this->assertCount(3, $this->repository->findAllByType('core'));
        $this->assertCount(3, $this->repository->findAllByType('drive'));
        $this->assertCount(3, $this->repository->findAllByType('sensor'));
        $this->assertCount(3, $this->repository->findAllByType('shield'));
        $this->assertCount(5, $this->repository->findAllByType('nav'));
    }
}
