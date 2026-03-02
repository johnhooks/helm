<?php

declare(strict_types=1);

namespace Tests\Wpunit\Inventory;

use Helm\Inventory\Contracts\InventoryRepository;
use Helm\Inventory\LocationType;
use Helm\Inventory\Models\Item;
use Helm\Products\Contracts\ProductRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Inventory\InventoryRepository
 * @covers \Helm\Inventory\Models\Item
 *
 * @property WpunitTester $tester
 */
class InventoryRepositoryTest extends WPTestCase
{
    private InventoryRepository $repository;
    private ProductRepository $productRepository;

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();

        $this->repository = helm(InventoryRepository::class);
        $this->productRepository = helm(ProductRepository::class);
    }

    public function test_insert_and_find(): void
    {
        $epochS = $this->productRepository->findBySlug('epoch_s');

        $item = new Item([
            'user_id' => 1,
            'product_id' => $epochS->id,
            'location_type' => LocationType::Personal,
            'quantity' => 1,
            'life' => 750,
            'usage_count' => 0,
            'meta' => ['origin' => 'starter'],
        ]);

        $id = $this->repository->insert($item);

        $this->assertNotFalse($id);
        $this->assertGreaterThan(0, $id);

        $found = $this->repository->find($id);

        $this->assertNotNull($found);
        $this->assertSame($id, $found->id);
        $this->assertSame(1, $found->user_id);
        $this->assertSame($epochS->id, $found->product_id);
        $this->assertSame(LocationType::Personal, $found->location_type);
        $this->assertNull($found->location_id);
        $this->assertSame(1, $found->quantity);
        $this->assertSame(750, $found->life);
        $this->assertSame(0, $found->usage_count);
        $this->assertSame(['origin' => 'starter'], $found->meta);
        $this->assertNotNull($found->created_at);
        $this->assertNotNull($found->updated_at);
    }

    public function test_findForUser(): void
    {
        $epochS = $this->productRepository->findBySlug('epoch_s');

        $item1 = new Item([
            'user_id' => 1,
            'product_id' => $epochS->id,
            'location_type' => LocationType::Personal,
        ]);
        $this->repository->insert($item1);

        $item2 = new Item([
            'user_id' => 1,
            'product_id' => $epochS->id,
            'location_type' => LocationType::Personal,
        ]);
        $this->repository->insert($item2);

        $items = $this->repository->findForUser(1);

        $this->assertCount(2, $items);
    }

    public function test_findForUser_returns_empty_for_other_user(): void
    {
        $epochS = $this->productRepository->findBySlug('epoch_s');

        $item = new Item([
            'user_id' => 1,
            'product_id' => $epochS->id,
            'location_type' => LocationType::Personal,
        ]);
        $this->repository->insert($item);

        $items = $this->repository->findForUser(999);

        $this->assertEmpty($items);
    }

    public function test_findAtLocation_personal(): void
    {
        $epochS = $this->productRepository->findBySlug('epoch_s');

        $item = new Item([
            'user_id' => 1,
            'product_id' => $epochS->id,
            'location_type' => LocationType::Personal,
        ]);
        $this->repository->insert($item);

        $items = $this->repository->findAtLocation(1, LocationType::Personal);

        $this->assertCount(1, $items);
    }

    public function test_findAtLocation_ship_cargo(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $epochS = $this->productRepository->findBySlug('epoch_s');

        $item = new Item([
            'user_id' => 1,
            'product_id' => $epochS->id,
            'location_type' => LocationType::Ship,
            'location_id' => $shipPost->postId(),
        ]);
        $this->repository->insert($item);

        // Find at specific ship
        $items = $this->repository->findAtLocation(1, LocationType::Ship, $shipPost->postId());
        $this->assertCount(1, $items);

        // Find at different ship (should be empty)
        $items = $this->repository->findAtLocation(1, LocationType::Ship, 9999);
        $this->assertEmpty($items);
    }

    public function test_findByProduct(): void
    {
        $epochS = $this->productRepository->findBySlug('epoch_s');

        $item = new Item([
            'user_id' => 1,
            'product_id' => $epochS->id,
            'location_type' => LocationType::Personal,
        ]);
        $this->repository->insert($item);

        $found = $this->repository->findByProduct(1, $epochS->id);

        $this->assertNotNull($found);
        $this->assertSame($epochS->id, $found->product_id);
    }

    public function test_findByProduct_returns_null_for_wrong_user(): void
    {
        $epochS = $this->productRepository->findBySlug('epoch_s');

        $item = new Item([
            'user_id' => 1,
            'product_id' => $epochS->id,
            'location_type' => LocationType::Personal,
        ]);
        $this->repository->insert($item);

        $found = $this->repository->findByProduct(999, $epochS->id);

        $this->assertNull($found);
    }

    public function test_update(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $epochS = $this->productRepository->findBySlug('epoch_s');

        $item = new Item([
            'user_id' => 1,
            'product_id' => $epochS->id,
            'location_type' => LocationType::Personal,
            'quantity' => 1,
            'life' => 750,
        ]);
        $id = $this->repository->insert($item);

        // Refetch and update
        $found = $this->repository->find($id);
        $found->location_type = LocationType::Ship;
        $found->location_id = $shipPost->postId();
        $found->quantity = 5;
        $found->life = 700;

        $result = $this->repository->update($found);

        $this->assertTrue($result);

        // Verify update
        $updated = $this->repository->find($id);
        $this->assertSame(LocationType::Ship, $updated->location_type);
        $this->assertSame($shipPost->postId(), $updated->location_id);
        $this->assertSame(5, $updated->quantity);
        $this->assertSame(700, $updated->life);
    }

    public function test_delete(): void
    {
        $epochS = $this->productRepository->findBySlug('epoch_s');

        $item = new Item([
            'user_id' => 1,
            'product_id' => $epochS->id,
            'location_type' => LocationType::Personal,
        ]);
        $id = $this->repository->insert($item);

        $result = $this->repository->delete($id);

        $this->assertTrue($result);
        $this->assertNull($this->repository->find($id));
    }

    public function test_update_returns_true_when_not_dirty(): void
    {
        $epochS = $this->productRepository->findBySlug('epoch_s');

        $item = new Item([
            'user_id' => 1,
            'product_id' => $epochS->id,
            'location_type' => LocationType::Personal,
            'quantity' => 1,
        ]);
        $id = $this->repository->insert($item);

        // Refetch - this syncs original values
        $found = $this->repository->find($id);

        // Update without changes should return true (no-op optimization)
        $result = $this->repository->update($found);

        $this->assertTrue($result);
    }

    public function test_location_type_enum_values(): void
    {
        $this->assertSame(1, LocationType::Personal->value);
        $this->assertSame(2, LocationType::Ship->value);
        $this->assertSame(3, LocationType::Station->value);
        $this->assertSame(4, LocationType::Gate->value);
    }

    public function test_findAllCargoAtLocation_excludes_fitted(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $oreProduct = $this->tester->haveProduct(['slug' => 'ore', 'type' => 'resource', 'label' => 'Ore']);
        $epochS = $this->productRepository->findBySlug('epoch_s');

        // Fitted component (has slot)
        $fitted = new Item([
            'user_id' => 1,
            'product_id' => $epochS->id,
            'location_type' => LocationType::Ship,
            'location_id' => $shipPost->postId(),
            'slot' => 'core',
            'life' => 750,
        ]);
        $this->repository->insert($fitted);

        // Cargo resource (no slot)
        $cargo = new Item([
            'user_id' => 1,
            'product_id' => $oreProduct->id,
            'location_type' => LocationType::Ship,
            'location_id' => $shipPost->postId(),
            'slot' => null,
            'quantity' => 100,
        ]);
        $this->repository->insert($cargo);

        $items = $this->repository->findAllCargoAtLocation(1, LocationType::Ship, $shipPost->postId());

        $this->assertCount(1, $items);
        $this->assertNull($items[0]->slot);
    }

    public function test_findAllCargoAtLocation_filters_by_product_type(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $oreProduct = $this->tester->haveProduct(['slug' => 'ore', 'type' => 'resource', 'label' => 'Ore']);
        $componentProduct = $this->tester->haveProduct(['slug' => 'spare_part', 'type' => 'component', 'label' => 'Spare Part']);

        // Loose component (no slot)
        $looseComponent = new Item([
            'user_id' => 1,
            'product_id' => $componentProduct->id,
            'location_type' => LocationType::Ship,
            'location_id' => $shipPost->postId(),
            'slot' => null,
        ]);
        $this->repository->insert($looseComponent);

        // Resource (no slot)
        $resource = new Item([
            'user_id' => 1,
            'product_id' => $oreProduct->id,
            'location_type' => LocationType::Ship,
            'location_id' => $shipPost->postId(),
            'slot' => null,
            'quantity' => 100,
        ]);
        $this->repository->insert($resource);

        // Filter by 'resource' type
        $items = $this->repository->findAllCargoAtLocation(1, LocationType::Ship, $shipPost->postId(), 'resource');

        $this->assertCount(1, $items);
        $this->assertSame($oreProduct->id, $items[0]->product_id);

        // Without filter, should get both
        $allItems = $this->repository->findAllCargoAtLocation(1, LocationType::Ship, $shipPost->postId());
        $this->assertCount(2, $allItems);
    }

    public function test_findCargoAtLocation(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $oreProduct = $this->tester->haveProduct(['slug' => 'ore', 'type' => 'resource', 'label' => 'Ore']);

        $cargo = new Item([
            'user_id' => 1,
            'product_id' => $oreProduct->id,
            'location_type' => LocationType::Ship,
            'location_id' => $shipPost->postId(),
            'slot' => null,
            'quantity' => 100,
        ]);
        $this->repository->insert($cargo);

        $found = $this->repository->findCargoAtLocation(
            1,
            'resource',
            $oreProduct->id,
            LocationType::Ship,
            $shipPost->postId()
        );

        $this->assertNotNull($found);
        $this->assertSame(100, $found->quantity);
    }

    public function test_findCargoAtLocation_excludes_fitted(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $epochS = $this->productRepository->findBySlug('epoch_s');

        // Fitted (has slot)
        $fitted = new Item([
            'user_id' => 1,
            'product_id' => $epochS->id,
            'location_type' => LocationType::Ship,
            'location_id' => $shipPost->postId(),
            'slot' => 'core',
            'life' => 750,
        ]);
        $this->repository->insert($fitted);

        // Should not find it as cargo
        $found = $this->repository->findCargoAtLocation(
            1,
            'core',
            $epochS->id,
            LocationType::Ship,
            $shipPost->postId()
        );

        $this->assertNull($found);
    }

    public function test_lifecycle_fields_persisted(): void
    {
        $epochS = $this->productRepository->findBySlug('epoch_s');

        $item = new Item([
            'user_id' => 1,
            'product_id' => $epochS->id,
            'location_type' => LocationType::Personal,
            'life' => 750,
            'usage_count' => 10,
            'meta' => ['created_by' => 1, 'origin' => 'manufactured', 'owner_history' => ['user_1', 'user_2']],
        ]);

        $id = $this->repository->insert($item);
        $found = $this->repository->find($id);

        $this->assertSame(750, $found->life);
        $this->assertSame(10, $found->usage_count);
        $this->assertSame(['created_by' => 1, 'origin' => 'manufactured', 'owner_history' => ['user_1', 'user_2']], $found->meta);
    }

    public function test_lifecycle_fields_update(): void
    {
        $epochS = $this->productRepository->findBySlug('epoch_s');

        $item = new Item([
            'user_id' => 1,
            'product_id' => $epochS->id,
            'location_type' => LocationType::Personal,
            'life' => 750,
            'usage_count' => 0,
        ]);

        $id = $this->repository->insert($item);
        $found = $this->repository->find($id);

        // Update lifecycle
        $found->life = 700;
        $found->usage_count = 5;
        $this->repository->update($found);

        $updated = $this->repository->find($id);
        $this->assertSame(700, $updated->life);
        $this->assertSame(5, $updated->usage_count);
    }

    public function test_null_life_for_resources(): void
    {
        $oreProduct = $this->tester->haveProduct(['slug' => 'ore', 'type' => 'resource', 'label' => 'Ore', 'hp' => null]);

        $item = new Item([
            'user_id' => 1,
            'product_id' => $oreProduct->id,
            'location_type' => LocationType::Personal,
            'life' => null,
            'quantity' => 100,
        ]);

        $id = $this->repository->insert($item);
        $found = $this->repository->find($id);

        $this->assertNull($found->life);
        $this->assertSame(100, $found->quantity);
    }

    public function test_findFittedByLocation(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $epochS = $this->productRepository->findBySlug('epoch_s');

        // Fitted component
        $fitted = new Item([
            'user_id' => 1,
            'product_id' => $epochS->id,
            'location_type' => LocationType::Ship,
            'location_id' => $shipPost->postId(),
            'slot' => 'core',
            'life' => 750,
            'usage_count' => 5,
        ]);
        $this->repository->insert($fitted);

        $results = $this->repository->findFittedByLocation(LocationType::Ship, $shipPost->postId());

        $this->assertCount(1, $results);
        $this->assertSame($epochS->id, $results[0]['product_id']);
        $this->assertSame('core', $results[0]['slot']);
        $this->assertSame(750, $results[0]['life']);
        $this->assertSame(5, $results[0]['usage_count']);
    }
}
