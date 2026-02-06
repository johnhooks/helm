<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\Products\ProductRepository;
use Helm\ShipLink\ShipFittingRepository;
use Helm\ShipLink\ShipFittingSlot;
use Helm\ShipLink\Models\ShipFitting;
use Helm\ShipLink\ShipComponentRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\ShipFittingRepository
 *
 * @property WpunitTester $tester
 */
class ShipFittingRepositoryTest extends WPTestCase
{
    private ShipFittingRepository $repository;
    private ShipComponentRepository $componentRepository;
    private ProductRepository $productRepository;

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();

        $this->repository = helm(ShipFittingRepository::class);
        $this->componentRepository = helm(ShipComponentRepository::class);
        $this->productRepository = helm(ProductRepository::class);
    }

    public function test_install_and_findBySlot(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $epochS = $this->productRepository->findBySlug('epoch_s');
        $component = $this->tester->haveComponent(['product_id' => $epochS->id, 'life' => 750]);

        $fitting = $this->tester->haveFitting($shipPost->postId(), $component->id, ShipFittingSlot::Core);

        $found = $this->repository->findBySlot($shipPost->postId(), ShipFittingSlot::Core);

        $this->assertNotNull($found);
        $this->assertSame($shipPost->postId(), $found->ship_post_id);
        $this->assertSame($component->id, $found->component_id);
        $this->assertSame(ShipFittingSlot::Core, $found->slot);
        $this->assertNotNull($found->installed_at);
    }

    public function test_findBySlot_returns_null_for_empty_slot(): void
    {
        $shipPost = $this->tester->haveShipPost();

        $found = $this->repository->findBySlot($shipPost->postId(), ShipFittingSlot::Equip1);

        $this->assertNull($found);
    }

    public function test_findForShip(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $epochS = $this->productRepository->findBySlug('epoch_s');
        $dr505 = $this->productRepository->findBySlug('dr_505');

        $core = $this->tester->haveComponent(['product_id' => $epochS->id, 'life' => 750]);
        $drive = $this->tester->haveComponent(['product_id' => $dr505->id]);

        $this->tester->haveFitting($shipPost->postId(), $core->id, ShipFittingSlot::Core);
        $this->tester->haveFitting($shipPost->postId(), $drive->id, ShipFittingSlot::Drive);

        $fittings = $this->repository->findForShip($shipPost->postId());

        $this->assertCount(2, $fittings);
        $slots = array_map(fn (ShipFitting $f) => $f->slot, $fittings);
        $this->assertContains(ShipFittingSlot::Core, $slots);
        $this->assertContains(ShipFittingSlot::Drive, $slots);
    }

    public function test_uninstall(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $epochS = $this->productRepository->findBySlug('epoch_s');
        $component = $this->tester->haveComponent(['product_id' => $epochS->id, 'life' => 750]);

        $this->tester->haveFitting($shipPost->postId(), $component->id, ShipFittingSlot::Core);

        $result = $this->repository->uninstall($shipPost->postId(), ShipFittingSlot::Core);

        $this->assertTrue($result);
        $this->assertNull($this->repository->findBySlot($shipPost->postId(), ShipFittingSlot::Core));
    }

    public function test_deleteForShip(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $epochS = $this->productRepository->findBySlug('epoch_s');
        $dr505 = $this->productRepository->findBySlug('dr_505');

        $core = $this->tester->haveComponent(['product_id' => $epochS->id, 'life' => 750]);
        $drive = $this->tester->haveComponent(['product_id' => $dr505->id]);

        $this->tester->haveFitting($shipPost->postId(), $core->id, ShipFittingSlot::Core);
        $this->tester->haveFitting($shipPost->postId(), $drive->id, ShipFittingSlot::Drive);

        $result = $this->repository->deleteForShip($shipPost->postId());

        $this->assertTrue($result);
        $this->assertEmpty($this->repository->findForShip($shipPost->postId()));
    }

    public function test_findForShip_empty_for_no_fittings(): void
    {
        $shipPost = $this->tester->haveShipPost();

        $fittings = $this->repository->findForShip($shipPost->postId());

        $this->assertEmpty($fittings);
    }

    public function test_findFittedByShip_returns_component_data(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $epochS = $this->productRepository->findBySlug('epoch_s');
        $dr505 = $this->productRepository->findBySlug('dr_505');

        $core = $this->tester->haveComponent(['product_id' => $epochS->id, 'life' => 750]);
        $drive = $this->tester->haveComponent(['product_id' => $dr505->id, 'life' => null]);

        $this->tester->haveFitting($shipPost->postId(), $core->id, ShipFittingSlot::Core);
        $this->tester->haveFitting($shipPost->postId(), $drive->id, ShipFittingSlot::Drive);

        $fitted = $this->repository->findFittedByShip($shipPost->postId());

        $this->assertCount(2, $fitted);

        // Find the core
        $coreData = null;
        foreach ($fitted as $item) {
            if ($item['slot'] === 'core') {
                $coreData = $item;
                break;
            }
        }

        $this->assertNotNull($coreData);
        $this->assertSame($core->id, $coreData['id']);
        $this->assertSame($epochS->id, $coreData['product_id']);
        $this->assertSame('core', $coreData['slot']);
        $this->assertSame(750, $coreData['life']);
        $this->assertSame(0, $coreData['usage_count']);
        $this->assertSame(1.0, $coreData['condition']);
    }

    public function test_findFittedByShip_returns_correct_structure(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $epochS = $this->productRepository->findBySlug('epoch_s');
        $component = $this->tester->haveComponent(['product_id' => $epochS->id, 'life' => 500]);
        $this->tester->haveFitting($shipPost->postId(), $component->id, ShipFittingSlot::Core);

        $fitted = $this->repository->findFittedByShip($shipPost->postId());

        $this->assertCount(1, $fitted);
        $item = $fitted[0];

        // Check all expected keys exist
        $this->assertArrayHasKey('id', $item);
        $this->assertArrayHasKey('product_id', $item);
        $this->assertArrayHasKey('slot', $item);
        $this->assertArrayHasKey('life', $item);
        $this->assertArrayHasKey('usage_count', $item);
        $this->assertArrayHasKey('condition', $item);

        // Check types
        $this->assertIsInt($item['id']);
        $this->assertIsInt($item['product_id']);
        $this->assertIsString($item['slot']);
        $this->assertIsInt($item['life']);
        $this->assertIsInt($item['usage_count']);
        $this->assertIsFloat($item['condition']);
    }

    public function test_findFittedByShip_empty_for_no_fittings(): void
    {
        $shipPost = $this->tester->haveShipPost();

        $fitted = $this->repository->findFittedByShip($shipPost->postId());

        $this->assertEmpty($fitted);
    }

    public function test_findFittedByShip_handles_null_life(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $dr505 = $this->productRepository->findBySlug('dr_505');
        $component = $this->tester->haveComponent(['product_id' => $dr505->id, 'life' => null]);
        $this->tester->haveFitting($shipPost->postId(), $component->id, ShipFittingSlot::Drive);

        $fitted = $this->repository->findFittedByShip($shipPost->postId());

        $this->assertCount(1, $fitted);
        $this->assertNull($fitted[0]['life']);
    }
}
