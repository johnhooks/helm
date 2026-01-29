<?php

declare(strict_types=1);

namespace Tests\Wpunit\Origin;

use Helm\Origin\Origin;
use Helm\Origin\OriginConfig;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\Origin\Origin
 * @covers \Helm\Origin\OriginConfig
 */
class OriginTest extends WPTestCase
{
    private Origin $origin;

    public function _before(): void
    {
        parent::_before();

        $this->origin = helm(Origin::class);

        // Clean up any existing origin
        $this->origin->reset();
    }

    public function test_is_initialized_returns_false_when_no_origin(): void
    {
        $this->assertFalse($this->origin->isInitialized());
    }

    public function test_can_initialize_origin(): void
    {
        $config = $this->origin->initialize('test-origin');

        $this->assertInstanceOf(OriginConfig::class, $config);
        $this->assertSame('test-origin', $config->id);
        $this->assertNotEmpty($config->masterSeed);
        $this->assertSame(3, $config->knownSpaceThreshold);
        $this->assertGreaterThan(0, $config->createdAt);
    }

    public function test_is_initialized_returns_true_after_initialization(): void
    {
        $this->origin->initialize('test-origin');

        $this->assertTrue($this->origin->isInitialized());
    }

    public function test_initialize_with_custom_seed(): void
    {
        $customSeed = 'my-custom-seed-12345';
        $config = $this->origin->initialize('test-origin', $customSeed);

        $this->assertSame($customSeed, $config->masterSeed);
    }

    public function test_initialize_throws_if_already_initialized(): void
    {
        $this->origin->initialize('first-origin');

        $this->expectException(\RuntimeException::class);
        $this->origin->initialize('second-origin');
    }

    public function test_config_returns_origin_config(): void
    {
        $this->origin->initialize('test-origin', 'test-seed');

        $config = $this->origin->config();

        $this->assertInstanceOf(OriginConfig::class, $config);
        $this->assertSame('test-origin', $config->id);
        $this->assertSame('test-seed', $config->masterSeed);
    }

    public function test_config_throws_if_not_initialized(): void
    {
        // Need a fresh Origin instance since singletons cache state
        $freshOrigin = new Origin();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Origin has not been initialized');

        $freshOrigin->config();
    }

    public function test_system_seed_is_deterministic(): void
    {
        $this->origin->initialize('test-origin', 'master-seed');

        $seed1 = $this->origin->systemSeed('HIP_8102');
        $seed2 = $this->origin->systemSeed('HIP_8102');

        $this->assertSame($seed1, $seed2);
    }

    public function test_system_seed_differs_by_star(): void
    {
        $this->origin->initialize('test-origin', 'master-seed');

        $seed1 = $this->origin->systemSeed('HIP_8102');
        $seed2 = $this->origin->systemSeed('SOL');

        $this->assertNotSame($seed1, $seed2);
    }

    public function test_system_seed_differs_by_algorithm_version(): void
    {
        $this->origin->initialize('test-origin', 'master-seed');

        $seed1 = $this->origin->systemSeed('HIP_8102', 1);
        $seed2 = $this->origin->systemSeed('HIP_8102', 2);

        $this->assertNotSame($seed1, $seed2);
    }

    public function test_origin_config_from_row(): void
    {
        $row = [
            'id' => 'test-id',
            'master_seed' => 'test-seed',
            'known_space_threshold' => 5,
            'created_at' => 1700000000,
        ];

        $config = OriginConfig::fromRow($row);

        $this->assertSame('test-id', $config->id);
        $this->assertSame('test-seed', $config->masterSeed);
        $this->assertSame(5, $config->knownSpaceThreshold);
        $this->assertSame(1700000000, $config->createdAt);
    }

    public function test_origin_config_to_row(): void
    {
        $config = new OriginConfig(
            id: 'test-id',
            masterSeed: 'test-seed',
            knownSpaceThreshold: 5,
            createdAt: 1700000000,
        );

        $row = $config->toRow();

        $this->assertSame('test-id', $row['id']);
        $this->assertSame('test-seed', $row['master_seed']);
        $this->assertSame(5, $row['known_space_threshold']);
        $this->assertSame(1700000000, $row['created_at']);
    }
}
