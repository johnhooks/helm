<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\ShipLink\Models\ShipSystem;
use Helm\ShipLink\ShipSystemRepository;
use Helm\ShipLink\SystemTypeRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\ShipSystemRepository
 *
 * @property WpunitTester $tester
 */
class ShipSystemRepositoryTest extends WPTestCase
{
    private ShipSystemRepository $repository;
    private SystemTypeRepository $typeRepository;

    public function _before(): void
    {
        parent::_before();
        $this->repository = helm(ShipSystemRepository::class);
        $this->typeRepository = helm(SystemTypeRepository::class);
    }

    public function test_insert_and_find(): void
    {
        $epochS = $this->typeRepository->findBySlug('epoch_s');

        $component = $this->tester->haveComponent([
            'type_id' => $epochS->id,
            'life' => 750,
            'origin' => 'starter',
            'created_by' => 1,
        ]);

        $this->assertGreaterThan(0, $component->id);

        $found = $this->repository->find($component->id);

        $this->assertNotNull($found);
        $this->assertSame($component->id, $found->id);
        $this->assertSame($epochS->id, $found->type_id);
        $this->assertSame(750, $found->life);
        $this->assertSame('starter', $found->origin);
        $this->assertSame(1, $found->created_by);
        $this->assertSame(0, $found->usage_count);
        $this->assertSame(1.0, $found->condition);
    }

    public function test_find_returns_null_for_missing(): void
    {
        $found = $this->repository->find(999999);

        $this->assertNull($found);
    }

    public function test_update_with_dirty_tracking(): void
    {
        $epochS = $this->typeRepository->findBySlug('epoch_s');

        $component = $this->tester->haveComponent([
            'type_id' => $epochS->id,
            'life' => 750,
        ]);

        // Modify
        $component->life = 700;
        $component->usage_count = 5;

        $result = $this->repository->update($component);

        $this->assertTrue($result);

        // Verify persisted
        $found = $this->repository->find($component->id);
        $this->assertSame(700, $found->life);
        $this->assertSame(5, $found->usage_count);
    }

    public function test_update_noop_when_clean(): void
    {
        $epochS = $this->typeRepository->findBySlug('epoch_s');

        $component = $this->tester->haveComponent([
            'type_id' => $epochS->id,
            'life' => 750,
        ]);

        // No changes made
        $result = $this->repository->update($component);

        $this->assertTrue($result); // No-op returns true
    }

    public function test_delete(): void
    {
        $epochS = $this->typeRepository->findBySlug('epoch_s');

        $component = $this->tester->haveComponent([
            'type_id' => $epochS->id,
            'life' => 750,
        ]);

        $result = $this->repository->delete($component->id);

        $this->assertTrue($result);
        $this->assertNull($this->repository->find($component->id));
    }

    public function test_insert_sets_timestamps(): void
    {
        $epochS = $this->typeRepository->findBySlug('epoch_s');

        $component = $this->tester->haveComponent([
            'type_id' => $epochS->id,
            'life' => 750,
        ]);

        $this->assertNotNull($component->created_at);
        $this->assertNotNull($component->updated_at);
    }

    public function test_insert_with_null_life(): void
    {
        $dr505 = $this->typeRepository->findBySlug('dr_505');

        $component = $this->tester->haveComponent([
            'type_id' => $dr505->id,
            'life' => null,
        ]);

        $found = $this->repository->find($component->id);
        $this->assertNull($found->life);
    }

    public function test_roundtrip_preserves_owner_history(): void
    {
        $epochS = $this->typeRepository->findBySlug('epoch_s');

        $component = $this->tester->haveComponent([
            'type_id' => $epochS->id,
            'life' => 750,
            'owner_history' => ['user_1', 'user_2'],
        ]);

        $found = $this->repository->find($component->id);
        $this->assertSame(['user_1', 'user_2'], $found->owner_history);
    }
}
