<?php

declare(strict_types=1);

namespace Tests\Wpunit\Products;

use Helm\Products\ProductRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Products\ProductRepository
 *
 * @property WpunitTester $tester
 */
class ProductRepositoryTest extends WPTestCase
{
    private ProductRepository $repository;

    public function _before(): void
    {
        parent::_before();
        $this->repository = helm(ProductRepository::class);
    }

    public function test_insert_and_find(): void
    {
        $product = $this->tester->haveProduct([
            'slug' => 'test_core',
            'type' => 'core',
            'label' => 'Test Core',
            'hp' => 500,
            'footprint' => 20,
            'rate' => 5.0,
            'mult_a' => 1.0,
            'mult_b' => 0.75,
        ]);

        $this->assertGreaterThan(0, $product->id);

        $found = $this->repository->find($product->id);

        $this->assertNotNull($found);
        $this->assertSame($product->id, $found->id);
        $this->assertSame('test_core', $found->slug);
        $this->assertSame('core', $found->type);
        $this->assertSame('Test Core', $found->label);
        $this->assertSame(500, $found->hp);
        $this->assertSame(20, $found->footprint);
        $this->assertSame(5.0, $found->rate);
        $this->assertSame(1.0, $found->mult_a);
        $this->assertSame(0.75, $found->mult_b);
    }

    public function test_find_returns_null_for_missing(): void
    {
        $found = $this->repository->find(999999);

        $this->assertNull($found);
    }

    public function test_findBySlug_returns_latest_version(): void
    {
        $this->tester->haveProduct([
            'slug' => 'versioned_core',
            'type' => 'core',
            'label' => 'Version 1',
            'version' => 1,
        ]);

        $this->tester->haveProduct([
            'slug' => 'versioned_core',
            'type' => 'core',
            'label' => 'Version 2',
            'version' => 2,
        ]);

        $found = $this->repository->findBySlug('versioned_core');

        $this->assertNotNull($found);
        $this->assertSame('Version 2', $found->label);
        $this->assertSame(2, $found->version);
    }

    public function test_findBySlug_with_specific_version(): void
    {
        $this->tester->haveProduct([
            'slug' => 'spec_core',
            'type' => 'core',
            'label' => 'V1',
            'version' => 1,
        ]);

        $this->tester->haveProduct([
            'slug' => 'spec_core',
            'type' => 'core',
            'label' => 'V2',
            'version' => 2,
        ]);

        $found = $this->repository->findBySlug('spec_core', 1);

        $this->assertNotNull($found);
        $this->assertSame('V1', $found->label);
    }

    public function test_findBySlug_returns_null_for_missing(): void
    {
        $found = $this->repository->findBySlug('nonexistent');

        $this->assertNull($found);
    }

    public function test_findAllByType(): void
    {
        // Seeded products should exist. Let's check for cores.
        $cores = $this->repository->findAllByType('core');

        $this->assertNotEmpty($cores);
        foreach ($cores as $core) {
            $this->assertSame('core', $core->type);
        }
    }

    public function test_latestVersionOf(): void
    {
        $this->tester->haveProduct([
            'slug' => 'latest_test',
            'type' => 'drive',
            'label' => 'V1',
            'version' => 1,
        ]);

        $this->tester->haveProduct([
            'slug' => 'latest_test',
            'type' => 'drive',
            'label' => 'V3',
            'version' => 3,
        ]);

        $latest = $this->repository->latestVersionOf('latest_test');

        $this->assertSame(3, $latest);
    }

    public function test_latestVersionOf_returns_null_for_missing(): void
    {
        $latest = $this->repository->latestVersionOf('nonexistent');

        $this->assertNull($latest);
    }

    public function test_upsert_inserts_new(): void
    {
        $product = $this->repository->upsert([
            'slug' => 'upsert_new',
            'type' => 'sensor',
            'label' => 'New Upsert',
            'version' => 1,
            'range' => 5.0,
        ]);

        $this->assertGreaterThan(0, $product->id);
        $this->assertSame('upsert_new', $product->slug);
    }

    public function test_upsert_returns_existing(): void
    {
        $original = $this->tester->haveProduct([
            'slug' => 'upsert_existing',
            'type' => 'core',
            'label' => 'Original',
            'version' => 1,
        ]);

        $found = $this->repository->upsert([
            'slug' => 'upsert_existing',
            'version' => 1,
            'type' => 'core',
            'label' => 'Should Not Change',
        ]);

        $this->assertSame($original->id, $found->id);
        $this->assertSame('Original', $found->label);
    }

    public function test_seeded_products_exist(): void
    {
        // Verify bootstrap seeded the standard products
        $epochS = $this->repository->findBySlug('epoch_s');
        $this->assertNotNull($epochS);
        $this->assertSame('core', $epochS->type);
        $this->assertSame(750, $epochS->hp);

        $dr505 = $this->repository->findBySlug('dr_505');
        $this->assertNotNull($dr505);
        $this->assertSame('drive', $dr505->type);

        $vrs = $this->repository->findBySlug('vrs_mk1');
        $this->assertNotNull($vrs);
        $this->assertSame('sensor', $vrs->type);

        $aegisBeta = $this->repository->findBySlug('aegis_beta');
        $this->assertNotNull($aegisBeta);
        $this->assertSame('shield', $aegisBeta->type);

        $navTier1 = $this->repository->findBySlug('nav_tier_1');
        $this->assertNotNull($navTier1);
        $this->assertSame('nav', $navTier1->type);
    }

    public function test_insert_sets_timestamps(): void
    {
        $product = $this->tester->haveProduct([
            'slug' => 'timestamp_test',
            'type' => 'core',
            'label' => 'Timestamp Test',
        ]);

        $this->assertNotNull($product->created_at);
        $this->assertNotNull($product->updated_at);
    }

    public function test_roundtrip_preserves_stats(): void
    {
        $product = $this->tester->haveProduct([
            'slug' => 'roundtrip_stats',
            'type' => 'core',
            'label' => 'Roundtrip',
            'rate' => 10.0,
            'mult_a' => 1.0,
            'mult_b' => 1.0,
        ]);

        $found = $this->repository->find($product->id);

        $this->assertSame(10.0, $found->rate);
        $this->assertSame(1.0, $found->mult_a);
        $this->assertSame(1.0, $found->mult_b);
    }
}
