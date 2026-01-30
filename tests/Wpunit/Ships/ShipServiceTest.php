<?php

declare(strict_types=1);

namespace Tests\Wpunit\Ships;

use Helm\Ships\Ship;
use Helm\Ships\ShipRepository;
use Helm\Ships\ShipService;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Ships\ShipService
 * @covers \Helm\Ships\Ship
 * @covers \Helm\Ships\ShipRepository
 *
 * @property WpunitTester $tester
 */
class ShipServiceTest extends WPTestCase
{
    private ShipService $service;
    private ShipRepository $repository;
    private int $testUserId;

    public function _before(): void
    {
        parent::_before();

        $this->repository = helm(ShipRepository::class);
        $this->service = helm(ShipService::class);
        $this->testUserId = 1; // Admin user in tests
    }

    public function test_can_create_ship(): void
    {
        $ship = $this->service->create('Test Ship', $this->testUserId);

        $this->assertInstanceOf(Ship::class, $ship);
        $this->assertSame('Test Ship', $ship->name);
        $this->assertSame($this->testUserId, $ship->ownerId);
        $this->assertSame('SOL', $ship->location);
        $this->assertSame(10000, $ship->credits);
        $this->assertEmpty($ship->cargo);
    }

    public function test_create_generates_unique_id(): void
    {
        $ship1 = $this->service->create('Test Ship', $this->testUserId);
        $ship2 = $this->service->create('Test Ship', $this->testUserId);

        $this->assertNotSame($ship1->id, $ship2->id);
    }

    public function test_create_with_custom_id(): void
    {
        $ship = $this->service->create('Test Ship', $this->testUserId, 'test-custom-id');

        $this->assertSame('test-custom-id', $ship->id);
    }

    public function test_can_get_ship_by_id(): void
    {
        $created = $this->service->create('Test Ship', $this->testUserId, 'test-get-ship');

        $retrieved = $this->service->get('test-get-ship');

        $this->assertNotNull($retrieved);
        $this->assertSame($created->id, $retrieved->id);
        $this->assertSame($created->name, $retrieved->name);
    }

    public function test_get_returns_null_for_unknown_id(): void
    {
        $ship = $this->service->get('unknown-ship-id');

        $this->assertNull($ship);
    }

    public function test_can_update_location(): void
    {
        $this->service->create('Test Ship', $this->testUserId, 'test-location-ship');

        $this->service->updateLocation('test-location-ship', 'HIP_8102');

        $ship = $this->service->get('test-location-ship');
        $this->assertSame('HIP_8102', $ship->location);
    }

    public function test_update_location_throws_for_unknown_ship(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->service->updateLocation('unknown-ship', 'HIP_8102');
    }

    public function test_can_add_cargo(): void
    {
        $this->service->create('Test Ship', $this->testUserId, 'test-cargo-ship');

        $this->service->addCargo('test-cargo-ship', 'iron', 100);

        $ship = $this->service->get('test-cargo-ship');
        $this->assertSame(100, $ship->cargoQuantity('iron'));
    }

    public function test_add_cargo_accumulates(): void
    {
        $this->service->create('Test Ship', $this->testUserId, 'test-cargo-accumulate');

        $this->service->addCargo('test-cargo-accumulate', 'iron', 50);
        $this->service->addCargo('test-cargo-accumulate', 'iron', 30);

        $ship = $this->service->get('test-cargo-accumulate');
        $this->assertSame(80, $ship->cargoQuantity('iron'));
    }

    public function test_add_cargo_throws_for_non_positive_quantity(): void
    {
        $this->service->create('Test Ship', $this->testUserId, 'test-cargo-invalid');

        $this->expectException(\InvalidArgumentException::class);
        $this->service->addCargo('test-cargo-invalid', 'iron', 0);
    }

    public function test_can_remove_cargo(): void
    {
        $this->service->create('Test Ship', $this->testUserId, 'test-remove-cargo');
        $this->service->addCargo('test-remove-cargo', 'iron', 100);

        $this->service->removeCargo('test-remove-cargo', 'iron', 30);

        $ship = $this->service->get('test-remove-cargo');
        $this->assertSame(70, $ship->cargoQuantity('iron'));
    }

    public function test_remove_cargo_removes_key_when_empty(): void
    {
        $this->service->create('Test Ship', $this->testUserId, 'test-remove-all');
        $this->service->addCargo('test-remove-all', 'iron', 100);

        $this->service->removeCargo('test-remove-all', 'iron', 100);

        $ship = $this->service->get('test-remove-all');
        $this->assertArrayNotHasKey('iron', $ship->cargo);
    }

    public function test_remove_cargo_throws_for_insufficient(): void
    {
        $this->service->create('Test Ship', $this->testUserId, 'test-insufficient');
        $this->service->addCargo('test-insufficient', 'iron', 50);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Insufficient cargo');
        $this->service->removeCargo('test-insufficient', 'iron', 100);
    }

    public function test_can_add_credits(): void
    {
        $this->service->create('Test Ship', $this->testUserId, 'test-add-credits');

        $this->service->addCredits('test-add-credits', 5000);

        $ship = $this->service->get('test-add-credits');
        $this->assertSame(15000, $ship->credits); // 10000 default + 5000
    }

    public function test_can_remove_credits(): void
    {
        $this->service->create('Test Ship', $this->testUserId, 'test-remove-credits');

        $this->service->removeCredits('test-remove-credits', 3000);

        $ship = $this->service->get('test-remove-credits');
        $this->assertSame(7000, $ship->credits);
    }

    public function test_remove_credits_throws_for_insufficient(): void
    {
        $this->service->create('Test Ship', $this->testUserId, 'test-insufficient-credits');

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Insufficient credits');
        $this->service->removeCredits('test-insufficient-credits', 20000);
    }

    public function test_can_delete_ship(): void
    {
        $this->service->create('Test Ship', $this->testUserId, 'test-delete-ship');

        $this->service->delete('test-delete-ship');

        $this->assertNull($this->service->get('test-delete-ship'));
    }

    public function test_all_returns_all_ships(): void
    {
        $this->service->create('Test Ship 1', $this->testUserId, 'test-all-1');
        $this->service->create('Test Ship 2', $this->testUserId, 'test-all-2');

        $ships = $this->service->all();

        $ids = array_map(fn(Ship $s) => $s->id, $ships);
        $this->assertContains('test-all-1', $ids);
        $this->assertContains('test-all-2', $ids);
    }

    public function test_ship_total_cargo(): void
    {
        $ship = new Ship(
            id: 'test',
            name: 'Test',
            ownerId: 1,
            location: 'SOL',
            cargo: ['iron' => 100, 'copper' => 50],
        );

        $this->assertSame(150, $ship->totalCargo());
    }

    public function test_ship_has_artifact(): void
    {
        $ship = new Ship(
            id: 'test',
            name: 'Test',
            ownerId: 1,
            location: 'SOL',
            artifacts: ['artifact-1', 'artifact-2'],
        );

        $this->assertTrue($ship->hasArtifact('artifact-1'));
        $this->assertFalse($ship->hasArtifact('artifact-3'));
    }

    public function test_ship_with_methods_return_new_instance(): void
    {
        $ship = new Ship(
            id: 'test',
            name: 'Test',
            ownerId: 1,
            location: 'SOL',
            credits: 1000,
        );

        $moved = $ship->withLocation('HIP_8102');
        $credited = $ship->withCredits(2000);

        // Original unchanged
        $this->assertSame('SOL', $ship->location);
        $this->assertSame(1000, $ship->credits);

        // New instances have new values
        $this->assertSame('HIP_8102', $moved->location);
        $this->assertSame(2000, $credited->credits);
    }

    public function test_with_methods_preserve_owner_id(): void
    {
        $ship = new Ship(
            id: 'test',
            name: 'Test',
            ownerId: 42,
            location: 'SOL',
            credits: 1000,
            fuel: 100.0,
            nodeId: 1,
            cargo: ['iron' => 50],
        );

        // All with* methods should preserve ownerId
        $this->assertSame(42, $ship->withLocation('HIP_8102')->ownerId);
        $this->assertSame(42, $ship->withNodeId(5)->ownerId);
        $this->assertSame(42, $ship->withCredits(2000)->ownerId);
        $this->assertSame(42, $ship->withFuel(50.0)->ownerId);
        $this->assertSame(42, $ship->withCargo(['gold' => 10])->ownerId);
    }

    public function test_get_for_user_returns_ship(): void
    {
        $this->service->create('User Ship', $this->testUserId, 'user-ship-test');

        $ship = $this->service->getForUser($this->testUserId);

        $this->assertNotNull($ship);
        $this->assertSame('user-ship-test', $ship->id);
        $this->assertSame($this->testUserId, $ship->ownerId);
    }

    public function test_get_for_user_returns_null_when_no_ship(): void
    {
        $ship = $this->service->getForUser(99999);

        $this->assertNull($ship);
    }

    public function test_user_has_ship(): void
    {
        $this->assertFalse($this->service->userHasShip(88888));

        $this->service->create('Test Ship', 88888, 'has-ship-test');

        $this->assertTrue($this->service->userHasShip(88888));
    }

    public function test_get_or_create_for_user_creates_new_ship(): void
    {
        $userId = 77777;
        $this->assertFalse($this->service->userHasShip($userId));

        $ship = $this->service->getOrCreateForUser($userId, 'New Ship');

        $this->assertNotNull($ship);
        $this->assertSame('New Ship', $ship->name);
        $this->assertSame($userId, $ship->ownerId);
        $this->assertTrue($this->service->userHasShip($userId));
    }

    public function test_get_or_create_for_user_returns_existing_ship(): void
    {
        $userId = 66666;
        $existing = $this->service->create('Existing Ship', $userId, 'existing-ship');

        $ship = $this->service->getOrCreateForUser($userId, 'Different Name');

        // Should return existing ship, not create new one
        $this->assertSame($existing->id, $ship->id);
        $this->assertSame('Existing Ship', $ship->name);
    }
}
