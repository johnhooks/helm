<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\Inventory\Contracts\InventoryRepository;
use Helm\Inventory\LocationType;
use Helm\Inventory\Models\Item;
use Helm\Products\Contracts\ProductRepository;
use Helm\ShipLink\System\Cargo;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\System\Cargo
 * @covers \Helm\ShipLink\Contracts\Cargo
 *
 * @property WpunitTester $tester
 */
class CargoTest extends WPTestCase
{
    private InventoryRepository $inventoryRepository;
    private ProductRepository $productRepository;

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();

        $this->inventoryRepository = helm(InventoryRepository::class);
        $this->productRepository = helm(ProductRepository::class);
    }

    private function createCargo(int $shipPostId, int $ownerId): Cargo
    {
        return new Cargo(
            $this->inventoryRepository,
            $this->productRepository,
            $shipPostId,
            $ownerId,
        );
    }

    public function test_isEmpty_returns_true_when_no_cargo(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $cargo = $this->createCargo($shipPost->postId(), $shipPost->ownerId());

        $this->assertTrue($cargo->isEmpty());
    }

    public function test_isEmpty_returns_false_when_has_cargo(): void
    {
        $this->tester->haveProduct(['slug' => 'ore', 'type' => 'resource', 'label' => 'Ore']);
        $shipPost = $this->tester->haveShipPost();
        $cargo = $this->createCargo($shipPost->postId(), $shipPost->ownerId());

        $cargo->add('ore', 50);

        $this->assertFalse($cargo->isEmpty());
    }

    public function test_add_creates_inventory_item(): void
    {
        $this->tester->haveProduct(['slug' => 'ore', 'type' => 'resource', 'label' => 'Ore']);
        $shipPost = $this->tester->haveShipPost();
        $cargo = $this->createCargo($shipPost->postId(), $shipPost->ownerId());

        $newQuantity = $cargo->add('ore', 100);

        $this->assertSame(100, $newQuantity);
        $this->assertSame(100, $cargo->quantity('ore'));
    }

    public function test_add_stacks_on_existing_item(): void
    {
        $this->tester->haveProduct(['slug' => 'ore', 'type' => 'resource', 'label' => 'Ore']);
        $shipPost = $this->tester->haveShipPost();
        $cargo = $this->createCargo($shipPost->postId(), $shipPost->ownerId());

        $cargo->add('ore', 100);
        $newQuantity = $cargo->add('ore', 50);

        $this->assertSame(150, $newQuantity);
        $this->assertSame(150, $cargo->quantity('ore'));
    }

    public function test_add_throws_for_unknown_resource(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $cargo = $this->createCargo($shipPost->postId(), $shipPost->ownerId());

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Unknown resource: nonexistent');

        $cargo->add('nonexistent', 100);
    }

    public function test_remove_reduces_quantity(): void
    {
        $this->tester->haveProduct(['slug' => 'ore', 'type' => 'resource', 'label' => 'Ore']);
        $shipPost = $this->tester->haveShipPost();
        $cargo = $this->createCargo($shipPost->postId(), $shipPost->ownerId());

        $cargo->add('ore', 100);
        $removed = $cargo->remove('ore', 30);

        $this->assertSame(30, $removed);
        $this->assertSame(70, $cargo->quantity('ore'));
    }

    public function test_remove_deletes_item_when_fully_removed(): void
    {
        $this->tester->haveProduct(['slug' => 'ore', 'type' => 'resource', 'label' => 'Ore']);
        $shipPost = $this->tester->haveShipPost();
        $cargo = $this->createCargo($shipPost->postId(), $shipPost->ownerId());

        $cargo->add('ore', 100);
        $removed = $cargo->remove('ore', 100);

        $this->assertSame(100, $removed);
        $this->assertSame(0, $cargo->quantity('ore'));
        $this->assertTrue($cargo->isEmpty());
    }

    public function test_remove_caps_at_available_quantity(): void
    {
        $this->tester->haveProduct(['slug' => 'ore', 'type' => 'resource', 'label' => 'Ore']);
        $shipPost = $this->tester->haveShipPost();
        $cargo = $this->createCargo($shipPost->postId(), $shipPost->ownerId());

        $cargo->add('ore', 50);
        $removed = $cargo->remove('ore', 100);

        $this->assertSame(50, $removed);
        $this->assertSame(0, $cargo->quantity('ore'));
    }

    public function test_remove_returns_zero_when_no_cargo(): void
    {
        $this->tester->haveProduct(['slug' => 'ore', 'type' => 'resource', 'label' => 'Ore']);
        $shipPost = $this->tester->haveShipPost();
        $cargo = $this->createCargo($shipPost->postId(), $shipPost->ownerId());

        $removed = $cargo->remove('ore', 50);

        $this->assertSame(0, $removed);
    }

    public function test_quantity_returns_zero_for_missing_resource(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $cargo = $this->createCargo($shipPost->postId(), $shipPost->ownerId());

        $this->assertSame(0, $cargo->quantity('ore'));
    }

    public function test_has_returns_true_when_sufficient(): void
    {
        $this->tester->haveProduct(['slug' => 'ore', 'type' => 'resource', 'label' => 'Ore']);
        $shipPost = $this->tester->haveShipPost();
        $cargo = $this->createCargo($shipPost->postId(), $shipPost->ownerId());

        $cargo->add('ore', 100);

        $this->assertTrue($cargo->has('ore', 50));
        $this->assertTrue($cargo->has('ore', 100));
    }

    public function test_has_returns_false_when_insufficient(): void
    {
        $this->tester->haveProduct(['slug' => 'ore', 'type' => 'resource', 'label' => 'Ore']);
        $shipPost = $this->tester->haveShipPost();
        $cargo = $this->createCargo($shipPost->postId(), $shipPost->ownerId());

        $cargo->add('ore', 50);

        $this->assertFalse($cargo->has('ore', 100));
    }

    public function test_all_returns_all_cargo(): void
    {
        $this->tester->haveProduct(['slug' => 'ore', 'type' => 'resource', 'label' => 'Ore']);
        $this->tester->haveProduct(['slug' => 'fuel', 'type' => 'resource', 'label' => 'Fuel']);
        $shipPost = $this->tester->haveShipPost();
        $cargo = $this->createCargo($shipPost->postId(), $shipPost->ownerId());

        $cargo->add('ore', 100);
        $cargo->add('fuel', 50);

        $all = $cargo->all();

        $this->assertCount(2, $all);
        $this->assertSame(100, $all['ore']);
        $this->assertSame(50, $all['fuel']);
    }

    public function test_total_returns_sum_of_quantities(): void
    {
        $this->tester->haveProduct(['slug' => 'ore', 'type' => 'resource', 'label' => 'Ore']);
        $this->tester->haveProduct(['slug' => 'fuel', 'type' => 'resource', 'label' => 'Fuel']);
        $shipPost = $this->tester->haveShipPost();
        $cargo = $this->createCargo($shipPost->postId(), $shipPost->ownerId());

        $cargo->add('ore', 100);
        $cargo->add('fuel', 50);

        $this->assertSame(150, $cargo->total());
    }

    public function test_cargo_is_isolated_per_ship(): void
    {
        $this->tester->haveProduct(['slug' => 'ore', 'type' => 'resource', 'label' => 'Ore']);
        $ship1 = $this->tester->haveShipPost(['ownerId' => 1]);
        $ship2 = $this->tester->haveShipPost(['ownerId' => 1]);

        $cargo1 = $this->createCargo($ship1->postId(), $ship1->ownerId());
        $cargo2 = $this->createCargo($ship2->postId(), $ship2->ownerId());

        $cargo1->add('ore', 100);
        $cargo2->add('ore', 50);

        $this->assertSame(100, $cargo1->quantity('ore'));
        $this->assertSame(50, $cargo2->quantity('ore'));
    }

    public function test_cargo_does_not_include_fitted_components(): void
    {
        // Fitted components have a slot, cargo does not
        $shipPost = $this->tester->haveShip(); // Creates ship with default loadout (fitted components)

        $cargo = $this->createCargo($shipPost->postId(), $shipPost->ownerId());

        // Cargo should be empty - fitted components are not cargo
        $this->assertTrue($cargo->isEmpty());
        $this->assertSame(0, $cargo->total());
    }

    public function test_cargo_only_includes_resources(): void
    {
        // Create a component product (not a resource)
        $product = $this->tester->haveProduct(['slug' => 'spare_part', 'type' => 'component', 'label' => 'Spare Part']);

        $shipPost = $this->tester->haveShipPost();

        // Add component as loose inventory (no slot) - this is NOT cargo (product type is 'component', not 'resource')
        $item = new Item([
            'user_id' => $shipPost->ownerId(),
            'product_id' => $product->id,
            'location_type' => LocationType::Ship,
            'location_id' => $shipPost->postId(),
            'slot' => null,
        ]);
        $this->inventoryRepository->insert($item);

        $cargo = $this->createCargo($shipPost->postId(), $shipPost->ownerId());

        // Cargo should be empty - only products with type='resource' count as cargo
        $this->assertTrue($cargo->isEmpty());
    }
}
