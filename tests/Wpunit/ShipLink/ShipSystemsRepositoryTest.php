<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\ShipLink\Components\CoreType;
use Helm\ShipLink\Models\ShipSystems;
use Helm\ShipLink\ShipSystemsRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\ShipSystemsRepository
 *
 * @property WpunitTester $tester
 */
class ShipSystemsRepositoryTest extends WPTestCase
{
    private ShipSystemsRepository $repository;

    public function _before(): void
    {
        parent::_before();
        $this->repository = new ShipSystemsRepository();
    }

    public function test_find_returns_null_for_nonexistent(): void
    {
        $result = $this->repository->find(99999);

        $this->assertNull($result);
    }

    public function test_insert_and_find(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        $systems = ShipSystems::defaults($postId);
        $this->repository->insert($systems);

        $found = $this->repository->find($postId);

        $this->assertNotNull($found);
        $this->assertSame($postId, $found->ship_post_id);
        $this->assertSame(CoreType::EpochS, $found->core_type);
    }

    public function test_exists_returns_correct_value(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        $this->assertFalse($this->repository->exists($postId));

        $this->repository->insert(ShipSystems::defaults($postId));

        $this->assertTrue($this->repository->exists($postId));
    }

    public function test_find_or_create_creates_when_missing(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        $this->assertFalse($this->repository->exists($postId));

        $systems = $this->repository->findOrCreate($postId);

        $this->assertNotNull($systems);
        $this->assertTrue($this->repository->exists($postId));
    }

    public function test_find_or_create_returns_existing(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        // Create with custom core type
        $custom = ShipSystems::defaults($postId);
        $custom->core_type = CoreType::EpochR;
        $this->repository->insert($custom);

        $found = $this->repository->findOrCreate($postId);

        $this->assertSame(CoreType::EpochR, $found->core_type);
    }

    public function test_update_modifies_record(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        $systems = ShipSystems::defaults($postId);
        $this->repository->insert($systems);

        // Reload and modify
        $systems = $this->repository->find($postId);
        $systems->core_life = 250.0;
        $this->repository->update($systems);

        $found = $this->repository->find($postId);

        $this->assertSame(250.0, $found->core_life);
    }

    public function test_save_inserts_new_record(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        $systems = ShipSystems::defaults($postId);
        $result = $this->repository->save($systems);

        $this->assertTrue($result);
        $this->assertTrue($this->repository->exists($postId));
    }

    public function test_save_updates_existing_record(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        $systems = ShipSystems::defaults($postId);
        $this->repository->save($systems);

        // Reload to get a non-new model, then modify and save
        $systems = $this->repository->find($postId);
        $systems->core_life = 100.0;
        $this->repository->save($systems);

        $found = $this->repository->find($postId);
        $this->assertSame(100.0, $found->core_life);
    }

    public function test_delete_removes_record(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        $this->repository->insert(ShipSystems::defaults($postId));
        $this->assertTrue($this->repository->exists($postId));

        $result = $this->repository->delete($postId);

        $this->assertTrue($result);
        $this->assertFalse($this->repository->exists($postId));
    }

    public function test_count_returns_total(): void
    {
        $this->assertSame(0, $this->repository->count());

        $ship1 = $this->tester->haveShipPost();
        $ship2 = $this->tester->haveShipPost();

        $this->repository->insert(ShipSystems::defaults($ship1->postId()));
        $this->assertSame(1, $this->repository->count());

        $this->repository->insert(ShipSystems::defaults($ship2->postId()));
        $this->assertSame(2, $this->repository->count());
    }
}
