<?php

declare(strict_types=1);

namespace Tests\Wpunit\Ships;

use Helm\Ships\Ship;
use Helm\Ships\ShipRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Ships\ShipRepository
 * @covers \Helm\Ships\ShipPost
 *
 * @property WpunitTester $tester
 */
class ShipRepositoryTest extends WPTestCase
{
    private ShipRepository $repository;

    public function _before(): void
    {
        parent::_before();
        $this->repository = helm(ShipRepository::class);
    }

    public function test_can_save_ship(): void
    {
        $ship = new Ship(
            id: 'save-test',
            name: 'Test Ship',
            location: 'SOL',
            credits: 1000,
            cargo: [],
            artifacts: [],
            createdAt: time(),
            updatedAt: time(),
        );

        $this->repository->save($ship);

        $this->assertTrue($this->repository->exists('save-test'));
    }

    public function test_can_get_ship_by_id(): void
    {
        $ship = $this->tester->haveShip(['id' => 'unique-ship']);

        $retrieved = $this->repository->get('unique-ship');

        $this->assertInstanceOf(Ship::class, $retrieved);
        $this->assertSame('unique-ship', $retrieved->id);
    }

    public function test_get_returns_null_for_unknown_id(): void
    {
        $this->assertNull($this->repository->get('nonexistent-ship'));
    }

    public function test_ship_data_is_preserved(): void
    {
        $original = $this->tester->haveShip([
            'id' => 'preserve-test',
            'name' => 'Preserved Ship',
            'location' => 'SOL',
            'credits' => 1000,
            'cargo' => ['iron' => 50],
            'artifacts' => ['ancient_relic'],
        ]);

        $retrieved = $this->repository->get('preserve-test');

        $this->assertSame($original->id, $retrieved->id);
        $this->assertSame($original->name, $retrieved->name);
        $this->assertSame($original->location, $retrieved->location);
        $this->assertSame($original->credits, $retrieved->credits);
        $this->assertSame($original->cargo, $retrieved->cargo);
        $this->assertSame($original->artifacts, $retrieved->artifacts);
    }

    public function test_save_updates_existing_ship(): void
    {
        $ship = $this->tester->haveShip(['id' => 'update-test']);

        $updated = new Ship(
            id: 'update-test',
            name: 'Updated Name',
            location: 'HIP_8102',
            credits: 5000,
            cargo: ['gold' => 100],
            artifacts: [],
            createdAt: $ship->createdAt,
            updatedAt: time(),
        );

        $this->repository->save($updated);
        $retrieved = $this->repository->get('update-test');

        $this->assertSame('Updated Name', $retrieved->name);
        $this->assertSame('HIP_8102', $retrieved->location);
        $this->assertSame(5000, $retrieved->credits);
    }

    public function test_can_delete_ship(): void
    {
        $this->tester->haveShip(['id' => 'delete-test']);

        $this->repository->delete('delete-test');

        $this->tester->dontSeeShipInDatabase('delete-test');
    }

    public function test_delete_nonexistent_ship_does_not_error(): void
    {
        // Should not throw
        $this->repository->delete('nonexistent-ship');

        $this->assertNull($this->repository->get('nonexistent-ship'));
    }

    public function test_all_returns_all_ships(): void
    {
        $this->tester->haveShips(3, ['id' => 'BULK']);

        $all = $this->repository->all();

        $this->assertCount(3, $all);
        foreach ($all as $ship) {
            $this->assertInstanceOf(Ship::class, $ship);
        }
    }

    public function test_count_returns_correct_number(): void
    {
        $this->assertSame(0, $this->repository->count());

        $this->tester->haveShip(['id' => 'count-1']);
        $this->assertSame(1, $this->repository->count());

        $this->tester->haveShip(['id' => 'count-2']);
        $this->assertSame(2, $this->repository->count());
    }

    public function test_exists_returns_correct_boolean(): void
    {
        $this->assertFalse($this->repository->exists('exists-test'));

        $this->tester->haveShip(['id' => 'exists-test']);

        $this->assertTrue($this->repository->exists('exists-test'));
        $this->assertFalse($this->repository->exists('unknown'));
    }

    public function test_get_by_post_id(): void
    {
        $ship = $this->tester->haveShip(['id' => 'post-id-test']);

        // Get the post ID through a query
        $posts = get_posts([
            'post_type' => 'helm_ship',
            'meta_key' => '_helm_ship_id',
            'meta_value' => 'post-id-test',
            'posts_per_page' => 1,
        ]);

        $this->assertNotEmpty($posts);

        $retrieved = $this->repository->getByPostId($posts[0]->ID);

        $this->assertInstanceOf(Ship::class, $retrieved);
        $this->assertSame('post-id-test', $retrieved->id);
    }

    public function test_at_location_returns_ships_at_star(): void
    {
        $this->tester->haveShip(['id' => 'ship-at-sol', 'location' => 'SOL']);
        $this->tester->haveShip(['id' => 'ship-at-tau-ceti', 'location' => 'HIP_8102']);

        $shipsAtSol = $this->repository->atLocation('SOL');

        $this->assertCount(1, $shipsAtSol);
        $this->assertSame('ship-at-sol', $shipsAtSol[0]->id);
    }

    public function test_cargo_is_preserved(): void
    {
        $this->tester->haveShip([
            'id' => 'cargo-test',
            'cargo' => [
                'iron' => 100,
                'gold' => 50,
                'rare_earth' => 25,
            ],
        ]);

        $retrieved = $this->repository->get('cargo-test');

        $this->assertSame(['iron' => 100, 'gold' => 50, 'rare_earth' => 25], $retrieved->cargo);
    }

    public function test_artifacts_are_preserved(): void
    {
        $this->tester->haveShip([
            'id' => 'artifacts-test',
            'artifacts' => ['ancient_tablet', 'star_map', 'alien_device'],
        ]);

        $retrieved = $this->repository->get('artifacts-test');

        $this->assertSame(['ancient_tablet', 'star_map', 'alien_device'], $retrieved->artifacts);
    }

    public function test_navigation_fields_are_preserved(): void
    {
        $this->tester->haveShip([
            'id' => 'nav-test',
            'nodeId' => 42,
            'fuel' => 75.5,
            'driveRange' => 10.0,
            'navSkill' => 0.8,
            'navEfficiency' => 0.6,
        ]);

        $retrieved = $this->repository->get('nav-test');

        $this->assertSame(42, $retrieved->nodeId);
        $this->assertSame(75.5, $retrieved->fuel);
        $this->assertSame(10.0, $retrieved->driveRange);
        $this->assertSame(0.8, $retrieved->navSkill);
        $this->assertSame(0.6, $retrieved->navEfficiency);
    }

    public function test_navigation_fields_use_defaults_when_not_set(): void
    {
        $this->tester->haveShip(['id' => 'nav-defaults-test']);

        $retrieved = $this->repository->get('nav-defaults-test');

        $this->assertSame(0, $retrieved->nodeId);
        $this->assertSame(Ship::DEFAULT_FUEL, $retrieved->fuel);
        $this->assertSame(Ship::DEFAULT_DRIVE_RANGE, $retrieved->driveRange);
        $this->assertSame(Ship::DEFAULT_NAV_SKILL, $retrieved->navSkill);
        $this->assertSame(Ship::DEFAULT_NAV_EFFICIENCY, $retrieved->navEfficiency);
    }
}
