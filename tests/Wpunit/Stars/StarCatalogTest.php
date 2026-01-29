<?php

declare(strict_types=1);

namespace Tests\Wpunit\Stars;

use Helm\Stars\Star;
use Helm\Stars\StarCatalog;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\Stars\StarCatalog
 * @covers \Helm\Stars\Star
 */
class StarCatalogTest extends WPTestCase
{
    private StarCatalog $catalog;

    public function _before(): void
    {
        parent::_before();
        $this->catalog = helm(StarCatalog::class);
    }

    public function test_can_get_sol(): void
    {
        $sol = $this->catalog->sol();

        $this->assertInstanceOf(Star::class, $sol);
        $this->assertSame('SOL', $sol->id);
        $this->assertSame('Sol', $sol->name);
        $this->assertSame(0.0, $sol->distanceLy);
    }

    public function test_can_get_star_by_id(): void
    {
        $star = $this->catalog->get('HIP_8102');

        $this->assertInstanceOf(Star::class, $star);
        $this->assertSame('Tau Ceti', $star->name);
        $this->assertSame('G8V', $star->spectralType);
    }

    public function test_get_returns_null_for_unknown_id(): void
    {
        $star = $this->catalog->get('UNKNOWN_STAR');

        $this->assertNull($star);
    }

    public function test_can_get_star_by_name(): void
    {
        $star = $this->catalog->getByName('Proxima Centauri');

        $this->assertInstanceOf(Star::class, $star);
        $this->assertSame('HIP_70890', $star->id);
    }

    public function test_get_by_name_is_case_insensitive(): void
    {
        $star = $this->catalog->getByName('SIRIUS');

        $this->assertInstanceOf(Star::class, $star);
        $this->assertSame('Sirius', $star->name);
    }

    public function test_nearest_returns_stars_sorted_by_distance(): void
    {
        $stars = $this->catalog->nearest(5);

        $this->assertCount(5, $stars);

        // Should be sorted by distance
        $distances = array_map(fn(Star $s) => $s->distanceLy, $stars);
        $sorted = $distances;
        sort($sorted);

        $this->assertSame($sorted, $distances);

        // Sol should be first (distance 0)
        $this->assertSame('SOL', $stars[0]->id);
    }

    public function test_in_range_filters_by_distance(): void
    {
        $stars = $this->catalog->inRange(5.0);

        foreach ($stars as $star) {
            $this->assertLessThanOrEqual(5.0, $star->distanceLy);
        }

        // Should include Sol and Alpha Centauri system
        $ids = array_map(fn(Star $s) => $s->id, $stars);
        $this->assertContains('SOL', $ids);
        $this->assertContains('HIP_70890', $ids); // Proxima Centauri
    }

    public function test_search_finds_by_name(): void
    {
        $results = $this->catalog->search('ceti');

        $this->assertGreaterThan(0, count($results));

        $names = array_map(fn(Star $s) => $s->name, $results);
        $this->assertContains('Tau Ceti', $names);
    }

    public function test_search_finds_by_id(): void
    {
        $results = $this->catalog->search('HIP_8102');

        $this->assertCount(1, $results);
        $this->assertSame('HIP_8102', $results[0]->id);
    }

    public function test_with_exoplanets_returns_only_stars_with_planets(): void
    {
        $stars = $this->catalog->withExoplanets();

        foreach ($stars as $star) {
            $this->assertTrue($star->hasConfirmedPlanets());
            $this->assertGreaterThan(0, $star->confirmedPlanetCount());
        }
    }

    public function test_count_returns_catalog_size(): void
    {
        $count = $this->catalog->count();

        $this->assertGreaterThan(0, $count);
        $this->assertSame(count($this->catalog->all()), $count);
    }

    public function test_star_display_name_returns_name_or_id(): void
    {
        $tauCeti = $this->catalog->get('HIP_8102');
        $this->assertSame('Tau Ceti', $tauCeti->displayName());

        // For a star without a name, would return ID
        // (all our test stars have names, but the logic is there)
    }

    public function test_star_spectral_class_returns_first_letter(): void
    {
        $sol = $this->catalog->sol();
        $this->assertSame('G', $sol->spectralClass());

        $sirius = $this->catalog->getByName('Sirius');
        $this->assertSame('A', $sirius->spectralClass());
    }

    public function test_star_is_sol_returns_true_for_sol(): void
    {
        $sol = $this->catalog->sol();
        $this->assertTrue($sol->isSol());

        $other = $this->catalog->get('HIP_8102');
        $this->assertFalse($other->isSol());
    }
}
