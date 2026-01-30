<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\Database\Schema;
use Helm\ShipLink\Components\CoreType;
use Helm\ShipLink\Components\DriveType;
use Helm\ShipLink\Components\NavTier;
use Helm\ShipLink\Components\SensorType;
use Helm\ShipLink\Components\ShieldType;
use Helm\ShipLink\ShipSystems;
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
        $shipPost = $this->tester->haveShip();
        $postId = $shipPost->postId();

        $systems = ShipSystems::defaults($postId);
        $this->repository->insert($systems);

        $found = $this->repository->find($postId);

        $this->assertNotNull($found);
        $this->assertSame($postId, $found->shipPostId);
        $this->assertSame(CoreType::EpochS, $found->coreType);
    }

    public function test_exists_returns_correct_value(): void
    {
        $shipPost = $this->tester->haveShip();
        $postId = $shipPost->postId();

        $this->assertFalse($this->repository->exists($postId));

        $this->repository->insert(ShipSystems::defaults($postId));

        $this->assertTrue($this->repository->exists($postId));
    }

    public function test_find_or_create_creates_when_missing(): void
    {
        $shipPost = $this->tester->haveShip();
        $postId = $shipPost->postId();

        $this->assertFalse($this->repository->exists($postId));

        $systems = $this->repository->findOrCreate($postId);

        $this->assertNotNull($systems);
        $this->assertTrue($this->repository->exists($postId));
    }

    public function test_find_or_create_returns_existing(): void
    {
        $shipPost = $this->tester->haveShip();
        $postId = $shipPost->postId();

        // Create with custom core type
        $custom = new ShipSystems(
            shipPostId: $postId,
            coreType: CoreType::EpochR,
            driveType: DriveType::DR5,
            sensorType: SensorType::SRS,
            shieldType: ShieldType::Standard,
            navTier: NavTier::Tier1,
            powerFullAt: null,
            powerMax: 100.0,
            shieldsFullAt: null,
            shieldsMax: 100.0,
            coreLife: 500.0,
            hullIntegrity: 100.0,
            hullMax: 100.0,
            nodeId: null,
            cargo: [],
            currentActionId: null,
            createdAt: new \DateTimeImmutable(),
            updatedAt: new \DateTimeImmutable(),
        );
        $this->repository->insert($custom);

        $found = $this->repository->findOrCreate($postId);

        $this->assertSame(CoreType::EpochR, $found->coreType);
    }

    public function test_update_modifies_record(): void
    {
        $shipPost = $this->tester->haveShip();
        $postId = $shipPost->postId();

        $systems = ShipSystems::defaults($postId);
        $this->repository->insert($systems);

        // Create modified version
        $modified = new ShipSystems(
            shipPostId: $postId,
            coreType: $systems->coreType,
            driveType: $systems->driveType,
            sensorType: $systems->sensorType,
            shieldType: $systems->shieldType,
            navTier: $systems->navTier,
            powerFullAt: $systems->powerFullAt,
            powerMax: $systems->powerMax,
            shieldsFullAt: $systems->shieldsFullAt,
            shieldsMax: $systems->shieldsMax,
            coreLife: 250.0, // Changed
            hullIntegrity: 50.0, // Changed
            hullMax: $systems->hullMax,
            nodeId: 42, // Changed
            cargo: ['ore' => 100], // Changed
            currentActionId: $systems->currentActionId,
            createdAt: $systems->createdAt,
            updatedAt: $systems->updatedAt,
        );
        $this->repository->update($modified);

        $found = $this->repository->find($postId);

        $this->assertSame(250.0, $found->coreLife);
        $this->assertSame(50.0, $found->hullIntegrity);
        $this->assertSame(42, $found->nodeId);
        $this->assertSame(['ore' => 100], $found->cargo);
    }

    public function test_save_inserts_new_record(): void
    {
        $shipPost = $this->tester->haveShip();
        $postId = $shipPost->postId();

        $systems = ShipSystems::defaults($postId);
        $result = $this->repository->save($systems);

        $this->assertTrue($result);
        $this->assertTrue($this->repository->exists($postId));
    }

    public function test_save_updates_existing_record(): void
    {
        $shipPost = $this->tester->haveShip();
        $postId = $shipPost->postId();

        $systems = ShipSystems::defaults($postId);
        $this->repository->save($systems);

        $modified = new ShipSystems(
            shipPostId: $postId,
            coreType: $systems->coreType,
            driveType: $systems->driveType,
            sensorType: $systems->sensorType,
            shieldType: $systems->shieldType,
            navTier: $systems->navTier,
            powerFullAt: $systems->powerFullAt,
            powerMax: $systems->powerMax,
            shieldsFullAt: $systems->shieldsFullAt,
            shieldsMax: $systems->shieldsMax,
            coreLife: 100.0,
            hullIntegrity: $systems->hullIntegrity,
            hullMax: $systems->hullMax,
            nodeId: $systems->nodeId,
            cargo: $systems->cargo,
            currentActionId: $systems->currentActionId,
            createdAt: $systems->createdAt,
            updatedAt: $systems->updatedAt,
        );
        $this->repository->save($modified);

        $found = $this->repository->find($postId);
        $this->assertSame(100.0, $found->coreLife);
    }

    public function test_delete_removes_record(): void
    {
        $shipPost = $this->tester->haveShip();
        $postId = $shipPost->postId();

        $this->repository->insert(ShipSystems::defaults($postId));
        $this->assertTrue($this->repository->exists($postId));

        $result = $this->repository->delete($postId);

        $this->assertTrue($result);
        $this->assertFalse($this->repository->exists($postId));
    }

    public function test_at_node_returns_ships_at_location(): void
    {
        $ship1 = $this->tester->haveShip();
        $ship2 = $this->tester->haveShip();
        $ship3 = $this->tester->haveShip();

        $postId1 = $ship1->postId();
        $postId2 = $ship2->postId();
        $postId3 = $ship3->postId();

        // Two ships at node 10, one at node 20
        $this->insertWithNode($postId1, 10);
        $this->insertWithNode($postId2, 10);
        $this->insertWithNode($postId3, 20);

        $atNode10 = $this->repository->atNode(10);
        $atNode20 = $this->repository->atNode(20);

        $this->assertCount(2, $atNode10);
        $this->assertCount(1, $atNode20);
    }

    public function test_update_node_id(): void
    {
        $shipPost = $this->tester->haveShip();
        $postId = $shipPost->postId();

        $this->repository->insert(ShipSystems::defaults($postId));

        $this->repository->updateNodeId($postId, 42);

        $found = $this->repository->find($postId);
        $this->assertSame(42, $found->nodeId);
    }

    public function test_update_current_action(): void
    {
        $shipPost = $this->tester->haveShip();
        $postId = $shipPost->postId();

        $this->repository->insert(ShipSystems::defaults($postId));

        $this->repository->updateCurrentAction($postId, 99);

        $found = $this->repository->find($postId);
        $this->assertSame(99, $found->currentActionId);
    }

    public function test_count_returns_total(): void
    {
        $this->assertSame(0, $this->repository->count());

        $ship1 = $this->tester->haveShip();
        $ship2 = $this->tester->haveShip();

        $this->repository->insert(ShipSystems::defaults($ship1->postId()));
        $this->assertSame(1, $this->repository->count());

        $this->repository->insert(ShipSystems::defaults($ship2->postId()));
        $this->assertSame(2, $this->repository->count());
    }

    /**
     * Insert systems with a specific node ID.
     */
    private function insertWithNode(int $postId, int $nodeId): void
    {
        $systems = ShipSystems::defaults($postId);
        $modified = new ShipSystems(
            shipPostId: $postId,
            coreType: $systems->coreType,
            driveType: $systems->driveType,
            sensorType: $systems->sensorType,
            shieldType: $systems->shieldType,
            navTier: $systems->navTier,
            powerFullAt: $systems->powerFullAt,
            powerMax: $systems->powerMax,
            shieldsFullAt: $systems->shieldsFullAt,
            shieldsMax: $systems->shieldsMax,
            coreLife: $systems->coreLife,
            hullIntegrity: $systems->hullIntegrity,
            hullMax: $systems->hullMax,
            nodeId: $nodeId,
            cargo: $systems->cargo,
            currentActionId: $systems->currentActionId,
            createdAt: $systems->createdAt,
            updatedAt: $systems->updatedAt,
        );
        $this->repository->insert($modified);
    }
}
