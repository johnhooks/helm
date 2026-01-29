<?php

declare(strict_types=1);

namespace Tests\Wpunit\Discovery;

use Helm\Database\Schema;
use Helm\Discovery\Discovery;
use Helm\Discovery\DiscoveryRepository;
use Helm\Discovery\DiscoveryService;
use Helm\Generation\Generated\SystemContents;
use Helm\Origin\Origin;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Discovery\DiscoveryService
 * @covers \Helm\Discovery\Discovery
 * @covers \Helm\Discovery\DiscoveryRepository
 *
 * @property WpunitTester $tester
 */
class DiscoveryServiceTest extends WPTestCase
{
    private DiscoveryService $service;
    private DiscoveryRepository $repository;
    private Origin $origin;

    public function _before(): void
    {
        parent::_before();

        $this->repository = helm(DiscoveryRepository::class);
        $this->service = helm(DiscoveryService::class);
        $this->origin = helm(Origin::class);

        // Ensure tables exist (normally handled by plugin activation)
        if (! Schema::tablesExist()) {
            Schema::createTables();
        }

        // Initialize origin for tests
        $this->tester->haveOrigin('test-origin', 'test-seed');
    }

    private function createTestContents(string $starId): SystemContents
    {
        return new SystemContents(
            starId: $starId,
            algorithmVersion: 1,
        );
    }

    public function test_can_record_discovery(): void
    {
        $contents = $this->createTestContents('HIP_8102');

        $discovery = $this->service->record('HIP_8102', 'ship-test', $contents);

        $this->assertInstanceOf(Discovery::class, $discovery);
        $this->assertSame('HIP_8102', $discovery->starId);
        $this->assertSame('ship-test', $discovery->shipId);
        $this->assertTrue($discovery->isFirst);
    }

    public function test_first_discovery_is_marked(): void
    {
        $contents = $this->createTestContents('HIP_8102');

        $first = $this->service->record('HIP_8102', 'ship-1', $contents);
        $second = $this->service->record('HIP_8102', 'ship-2', $contents);

        $this->assertTrue($first->isFirst);
        $this->assertFalse($second->isFirst);
    }

    public function test_is_discovered_returns_correct_value(): void
    {
        $this->assertFalse($this->service->isDiscovered('HIP_8102'));

        $contents = $this->createTestContents('HIP_8102');
        $this->service->record('HIP_8102', 'ship-test', $contents);

        $this->assertTrue($this->service->isDiscovered('HIP_8102'));
    }

    public function test_get_discovery_count(): void
    {
        $contents = $this->createTestContents('HIP_8102');

        $this->assertSame(0, $this->service->getDiscoveryCount('HIP_8102'));

        $this->service->record('HIP_8102', 'ship-1', $contents);
        $this->assertSame(1, $this->service->getDiscoveryCount('HIP_8102'));

        $this->service->record('HIP_8102', 'ship-2', $contents);
        $this->assertSame(2, $this->service->getDiscoveryCount('HIP_8102'));
    }

    public function test_is_known_space(): void
    {
        $contents = $this->createTestContents('HIP_8102');

        // Threshold is 3 by default
        $this->assertFalse($this->service->isKnownSpace('HIP_8102'));

        $this->service->record('HIP_8102', 'ship-1', $contents);
        $this->service->record('HIP_8102', 'ship-2', $contents);
        $this->assertFalse($this->service->isKnownSpace('HIP_8102'));

        $this->service->record('HIP_8102', 'ship-3', $contents);
        $this->assertTrue($this->service->isKnownSpace('HIP_8102'));
    }

    public function test_get_first_discoverer(): void
    {
        $contents = $this->createTestContents('HIP_8102');

        $this->assertNull($this->service->getFirstDiscoverer('HIP_8102'));

        $this->service->record('HIP_8102', 'ship-pioneer', $contents);
        $this->service->record('HIP_8102', 'ship-follower', $contents);

        $this->assertSame('ship-pioneer', $this->service->getFirstDiscoverer('HIP_8102'));
    }

    public function test_get_by_ship(): void
    {
        $contents1 = $this->createTestContents('HIP_8102');
        $contents2 = $this->createTestContents('SOL');

        $this->service->record('HIP_8102', 'ship-explorer', $contents1);
        $this->service->record('SOL', 'ship-explorer', $contents2);
        $this->service->record('HIP_8102', 'ship-other', $contents1);

        $discoveries = $this->service->getByShip('ship-explorer');

        $this->assertCount(2, $discoveries);
        foreach ($discoveries as $discovery) {
            $this->assertSame('ship-explorer', $discovery->shipId);
        }
    }

    public function test_get_by_star(): void
    {
        $contents = $this->createTestContents('HIP_8102');

        $this->service->record('HIP_8102', 'ship-1', $contents);
        $this->service->record('HIP_8102', 'ship-2', $contents);

        $discoveries = $this->service->getByStar('HIP_8102');

        $this->assertCount(2, $discoveries);
        foreach ($discoveries as $discovery) {
            $this->assertSame('HIP_8102', $discovery->starId);
        }
    }

    public function test_has_ship_discovered(): void
    {
        $contents = $this->createTestContents('HIP_8102');

        $this->assertFalse($this->service->hasShipDiscovered('ship-test', 'HIP_8102'));

        $this->service->record('HIP_8102', 'ship-test', $contents);

        $this->assertTrue($this->service->hasShipDiscovered('ship-test', 'HIP_8102'));
        $this->assertFalse($this->service->hasShipDiscovered('ship-other', 'HIP_8102'));
    }

    public function test_get_first_discoveries(): void
    {
        $contents1 = $this->createTestContents('HIP_8102');
        $contents2 = $this->createTestContents('SOL');

        $this->service->record('HIP_8102', 'ship-1', $contents1);
        $this->service->record('SOL', 'ship-2', $contents2);
        $this->service->record('HIP_8102', 'ship-3', $contents1); // Not first

        $firsts = $this->service->getFirstDiscoveries();

        $this->assertCount(2, $firsts);
        foreach ($firsts as $discovery) {
            $this->assertTrue($discovery->isFirst);
        }
    }

    public function test_discovery_contains_hash(): void
    {
        $contents = $this->createTestContents('HIP_8102');

        $discovery = $this->service->record('HIP_8102', 'ship-test', $contents);

        $this->assertSame($contents->hash(), $discovery->contentsHash);
    }

    public function test_discovery_from_row(): void
    {
        $row = [
            'id' => 1,
            'star_id' => 'HIP_8102',
            'ship_id' => 'ship-test',
            'contents_hash' => 'abc123',
            'is_first' => 1,
            'discovered_at' => 1700000000,
        ];

        $discovery = Discovery::fromRow($row);

        $this->assertSame(1, $discovery->id);
        $this->assertSame('HIP_8102', $discovery->starId);
        $this->assertSame('ship-test', $discovery->shipId);
        $this->assertSame('abc123', $discovery->contentsHash);
        $this->assertTrue($discovery->isFirst);
        $this->assertSame(1700000000, $discovery->discoveredAt);
    }
}
