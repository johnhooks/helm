<?php

declare(strict_types=1);

namespace Tests\Wpunit\Generation;

use Helm\Generation\Generated\Planet;
use Helm\Generation\Generated\SystemContents;
use Helm\Generation\SystemGenerator;
use Helm\Stars\StarCatalog;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\Generation\SystemGenerator
 * @covers \Helm\Generation\Generated\SystemContents
 * @covers \Helm\Generation\Generated\Planet
 * @covers \Helm\Generation\Generated\AsteroidBelt
 * @covers \Helm\Generation\Generated\Station
 * @covers \Helm\Generation\Generated\Anomaly
 */
class SystemGeneratorTest extends WPTestCase
{
    private SystemGenerator $generator;
    private StarCatalog $catalog;

    public function _before(): void
    {
        parent::_before();
        $this->generator = helm(SystemGenerator::class);
        $this->catalog = helm(StarCatalog::class);
    }

    public function test_generates_system_for_star(): void
    {
        $star = $this->catalog->sol();
        $masterSeed = 'test-master-seed';

        $contents = $this->generator->generate($star, $masterSeed);

        $this->assertInstanceOf(SystemContents::class, $contents);
        $this->assertSame('SOL', $contents->starId);
        $this->assertSame(SystemGenerator::ALGORITHM_VERSION, $contents->algorithmVersion);
    }

    public function test_generation_is_deterministic(): void
    {
        $star = $this->catalog->get('HIP_8102'); // Tau Ceti
        $masterSeed = 'deterministic-test-seed';

        $contents1 = $this->generator->generate($star, $masterSeed);
        $contents2 = $this->generator->generate($star, $masterSeed);

        // Should produce identical results
        $this->assertSame($contents1->hash(), $contents2->hash());
        $this->assertSame($contents1->toArray(), $contents2->toArray());
    }

    public function test_different_seeds_produce_different_results(): void
    {
        // Use Tau Ceti (not SOL, which has real planet data)
        $star = $this->catalog->get('HIP_8102');

        $contents1 = $this->generator->generate($star, 'seed-alpha');
        $contents2 = $this->generator->generate($star, 'seed-beta');

        $this->assertNotSame($contents1->hash(), $contents2->hash());
    }

    public function test_different_stars_produce_different_results(): void
    {
        $masterSeed = 'same-seed';

        $contents1 = $this->generator->generate($this->catalog->sol(), $masterSeed);
        $contents2 = $this->generator->generate($this->catalog->get('HIP_8102'), $masterSeed);

        $this->assertNotSame($contents1->hash(), $contents2->hash());
    }

    public function test_generates_planets(): void
    {
        // Use Tau Ceti (not SOL, which has real planet data)
        $star = $this->catalog->get('HIP_8102');
        $contents = $this->generator->generate($star, 'planets-test');

        // K-type stars should have planets
        $this->assertGreaterThan(0, count($contents->planets));

        foreach ($contents->planets as $planet) {
            $this->assertInstanceOf(Planet::class, $planet);
            $this->assertStringStartsWith('HIP_8102_P', $planet->id);
            $this->assertGreaterThan(0, $planet->orbitAu);
        }
    }

    public function test_planets_are_ordered_by_orbit(): void
    {
        $star = $this->catalog->sol();
        $contents = $this->generator->generate($star, 'orbit-order-test');

        $lastAu = 0;
        foreach ($contents->planets as $index => $planet) {
            $this->assertSame($index, $planet->orbitIndex);
            $this->assertGreaterThan($lastAu, $planet->orbitAu);
            $lastAu = $planet->orbitAu;
        }
    }

    public function test_planets_have_valid_types(): void
    {
        $validTypes = [
            Planet::TYPE_TERRESTRIAL,
            Planet::TYPE_SUPER_EARTH,
            Planet::TYPE_GAS_GIANT,
            Planet::TYPE_ICE_GIANT,
            Planet::TYPE_DWARF,
            Planet::TYPE_MOLTEN,
            Planet::TYPE_FROZEN,
        ];

        $star = $this->catalog->sol();
        $contents = $this->generator->generate($star, 'type-test');

        foreach ($contents->planets as $planet) {
            $this->assertContains($planet->type, $validTypes);
        }
    }

    public function test_system_contents_hash_is_consistent(): void
    {
        $star = $this->catalog->sol();
        $contents = $this->generator->generate($star, 'hash-test');

        $hash1 = $contents->hash();
        $hash2 = $contents->hash();

        $this->assertSame($hash1, $hash2);
        $this->assertSame(64, strlen($hash1)); // SHA-256 hex
    }

    public function test_system_contents_to_array_and_back(): void
    {
        $star = $this->catalog->sol();
        $contents = $this->generator->generate($star, 'serialization-test');

        $array = $contents->toArray();
        $restored = SystemContents::fromArray($array);

        $this->assertSame($contents->hash(), $restored->hash());
        $this->assertSame($contents->starId, $restored->starId);
        $this->assertCount(count($contents->planets), $restored->planets);
    }

    public function test_generate_seed_is_deterministic(): void
    {
        $star = $this->catalog->sol();
        $masterSeed = 'seed-test';

        $seed1 = $this->generator->generateSeed($star, $masterSeed);
        $seed2 = $this->generator->generateSeed($star, $masterSeed);

        $this->assertSame($seed1, $seed2);
    }

    public function test_object_count_returns_total(): void
    {
        $star = $this->catalog->sol();
        $contents = $this->generator->generate($star, 'count-test');

        $expected = count($contents->planets)
            + count($contents->asteroidBelts)
            + count($contents->stations)
            + count($contents->anomalies);

        $this->assertSame($expected, $contents->objectCount());
    }

    public function test_is_empty_returns_correct_value(): void
    {
        $star = $this->catalog->sol();
        $contents = $this->generator->generate($star, 'empty-test');

        // Generated systems should have content
        $this->assertFalse($contents->isEmpty());

        // Empty system
        $empty = new SystemContents(
            starId: 'EMPTY',
            algorithmVersion: 1,
        );
        $this->assertTrue($empty->isEmpty());
    }
}
