<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\ShipLink\FittingRepository;
use Helm\ShipLink\FittingSlot;
use Helm\ShipLink\Models\Fitting;
use Helm\ShipLink\ShipSystemRepository;
use Helm\ShipLink\SystemTypeRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\FittingRepository
 *
 * @property WpunitTester $tester
 */
class FittingRepositoryTest extends WPTestCase
{
    private FittingRepository $repository;
    private ShipSystemRepository $systemRepository;
    private SystemTypeRepository $typeRepository;

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();

        $this->repository = helm(FittingRepository::class);
        $this->systemRepository = helm(ShipSystemRepository::class);
        $this->typeRepository = helm(SystemTypeRepository::class);
    }

    public function test_install_and_findBySlot(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $epochS = $this->typeRepository->findBySlug('epoch_s');
        $component = $this->tester->haveComponent(['type_id' => $epochS->id, 'life' => 750]);

        $fitting = $this->tester->haveFitting($shipPost->postId(), $component->id, FittingSlot::Core);

        $found = $this->repository->findBySlot($shipPost->postId(), FittingSlot::Core);

        $this->assertNotNull($found);
        $this->assertSame($shipPost->postId(), $found->ship_post_id);
        $this->assertSame($component->id, $found->system_id);
        $this->assertSame(FittingSlot::Core, $found->slot);
        $this->assertNotNull($found->installed_at);
    }

    public function test_findBySlot_returns_null_for_empty_slot(): void
    {
        $shipPost = $this->tester->haveShipPost();

        $found = $this->repository->findBySlot($shipPost->postId(), FittingSlot::Equip1);

        $this->assertNull($found);
    }

    public function test_findForShip(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $epochS = $this->typeRepository->findBySlug('epoch_s');
        $dr505 = $this->typeRepository->findBySlug('dr_505');

        $core = $this->tester->haveComponent(['type_id' => $epochS->id, 'life' => 750]);
        $drive = $this->tester->haveComponent(['type_id' => $dr505->id]);

        $this->tester->haveFitting($shipPost->postId(), $core->id, FittingSlot::Core);
        $this->tester->haveFitting($shipPost->postId(), $drive->id, FittingSlot::Drive);

        $fittings = $this->repository->findForShip($shipPost->postId());

        $this->assertCount(2, $fittings);
        $slots = array_map(fn (Fitting $f) => $f->slot, $fittings);
        $this->assertContains(FittingSlot::Core, $slots);
        $this->assertContains(FittingSlot::Drive, $slots);
    }

    public function test_uninstall(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $epochS = $this->typeRepository->findBySlug('epoch_s');
        $component = $this->tester->haveComponent(['type_id' => $epochS->id, 'life' => 750]);

        $this->tester->haveFitting($shipPost->postId(), $component->id, FittingSlot::Core);

        $result = $this->repository->uninstall($shipPost->postId(), FittingSlot::Core);

        $this->assertTrue($result);
        $this->assertNull($this->repository->findBySlot($shipPost->postId(), FittingSlot::Core));
    }

    public function test_deleteForShip(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $epochS = $this->typeRepository->findBySlug('epoch_s');
        $dr505 = $this->typeRepository->findBySlug('dr_505');

        $core = $this->tester->haveComponent(['type_id' => $epochS->id, 'life' => 750]);
        $drive = $this->tester->haveComponent(['type_id' => $dr505->id]);

        $this->tester->haveFitting($shipPost->postId(), $core->id, FittingSlot::Core);
        $this->tester->haveFitting($shipPost->postId(), $drive->id, FittingSlot::Drive);

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
}
