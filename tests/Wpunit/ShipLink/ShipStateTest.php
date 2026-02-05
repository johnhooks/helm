<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use DateTimeImmutable;
use Helm\ShipLink\Components\PowerMode;
use Helm\ShipLink\Models\ShipState;
use Helm\ShipLink\ShipStateRepository;
use Helm\StellarWP\Models\Model;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\Models\ShipState
 *
 * @property WpunitTester $tester
 */
class ShipStateTest extends WPTestCase
{
    private ShipStateRepository $repository;

    public function _before(): void
    {
        parent::_before();
        $this->repository = helm(ShipStateRepository::class);
    }

    public function test_can_construct_with_attributes(): void
    {
        $state = new ShipState([
            'ship_post_id' => 123,
            'power_mode' => PowerMode::Normal,
            'hull_integrity' => 85.0,
            'node_id' => 42,
        ]);

        $this->assertSame(123, $state->ship_post_id);
        $this->assertSame(PowerMode::Normal, $state->power_mode);
        $this->assertSame(85.0, $state->hull_integrity);
        $this->assertSame(42, $state->node_id);
    }

    public function test_fromData_casts_database_values(): void
    {
        $row = [
            'ship_post_id' => 123,
            'power_mode' => 2,
            'power_full_at' => '2025-01-15 10:00:00',
            'power_max' => 100.0,
            'shields_full_at' => '2025-01-15 11:00:00',
            'shields_max' => 100.0,
            'hull_integrity' => 85.0,
            'hull_max' => 100.0,
            'node_id' => 42,
            'cargo' => '{"ore":50,"fuel":25}',
            'current_action_id' => 99,
            'created_at' => '2025-01-01 00:00:00',
            'updated_at' => '2025-01-15 12:00:00',
        ];

        $state = ShipState::fromData($row, Model::BUILD_MODE_IGNORE_MISSING);

        $this->assertSame(123, $state->ship_post_id);
        $this->assertSame(PowerMode::Normal, $state->power_mode);
        $this->assertInstanceOf(DateTimeImmutable::class, $state->power_full_at);
        $this->assertSame(85.0, $state->hull_integrity);
        $this->assertSame(42, $state->node_id);
        $this->assertSame(['ore' => 50, 'fuel' => 25], $state->cargo);
        $this->assertSame(99, $state->current_action_id);
    }

    public function test_fromData_handles_null_values(): void
    {
        $row = [
            'ship_post_id' => 123,
            'power_mode' => 2,
            'power_full_at' => null,
            'power_max' => 100.0,
            'shields_full_at' => null,
            'shields_max' => 50.0,
            'hull_integrity' => 100.0,
            'hull_max' => 100.0,
            'node_id' => null,
            'cargo' => null,
            'current_action_id' => null,
            'created_at' => '2025-01-01 00:00:00',
            'updated_at' => '2025-01-01 00:00:00',
        ];

        $state = ShipState::fromData($row, Model::BUILD_MODE_IGNORE_MISSING);

        $this->assertNull($state->power_full_at);
        $this->assertNull($state->shields_full_at);
        $this->assertNull($state->node_id);
        $this->assertSame([], $state->cargo);
        $this->assertNull($state->current_action_id);
    }

    public function test_defaults_creates_standard_state(): void
    {
        $state = ShipState::defaults(456);

        $this->assertSame(456, $state->ship_post_id);
        $this->assertSame(PowerMode::Normal, $state->power_mode);
        $this->assertSame(100.0, $state->power_max);
        $this->assertSame(100.0, $state->shields_max);
        $this->assertSame(100.0, $state->hull_integrity);
        $this->assertSame(100.0, $state->hull_max);
        $this->assertSame(1, $state->node_id); // Sol
        $this->assertSame([], $state->cargo);
        $this->assertNull($state->current_action_id);
    }

    public function test_new_ship_starts_with_full_power_and_shields(): void
    {
        $this->tester->haveOrigin();
        $shipPost = $this->tester->haveShipPost();

        $state = ShipState::defaults($shipPost->postId());
        $this->repository->insert($state);

        // Reload from database to get database-set timestamps
        $restored = $this->repository->find($shipPost->postId());

        // Power and shields should be full (fullAt set by database DEFAULT CURRENT_TIMESTAMP)
        $this->assertNotNull($restored->power_full_at);
        $this->assertNotNull($restored->shields_full_at);
        $this->assertInstanceOf(DateTimeImmutable::class, $restored->power_full_at);
        $this->assertInstanceOf(DateTimeImmutable::class, $restored->shields_full_at);
    }

    public function test_dirty_tracking_works(): void
    {
        $state = ShipState::defaults(100);
        $state->syncOriginal();

        $this->assertFalse($state->isDirty());

        $state->hull_integrity = 50.0;

        $this->assertTrue($state->isDirty());
        $this->assertTrue($state->isDirty('hull_integrity'));
        $this->assertFalse($state->isDirty('power_max'));

        $dirty = $state->getDirty();
        $this->assertArrayHasKey('hull_integrity', $dirty);
        $this->assertSame(50.0, $dirty['hull_integrity']);
    }

    public function test_repository_roundtrip_preserves_data(): void
    {
        $this->tester->haveOrigin();
        $shipPost = $this->tester->haveShipPost();

        $original = ShipState::defaults($shipPost->postId());
        $this->repository->insert($original);

        $restored = $this->repository->find($shipPost->postId());

        $this->assertNotNull($restored);
        $this->assertSame($original->ship_post_id, $restored->ship_post_id);
        $this->assertSame($original->power_max, $restored->power_max);
        $this->assertSame($original->hull_integrity, $restored->hull_integrity);
        $this->assertSame($original->node_id, $restored->node_id);
    }
}
