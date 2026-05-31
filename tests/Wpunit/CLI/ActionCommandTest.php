<?php

declare(strict_types=1);

namespace Tests\Wpunit\CLI;

use DateTimeImmutable;
use Helm\CLI\ActionCommand;
use Helm\Database\Schema;
use Helm\Lib\Date;
use Helm\ShipLink\ActionProcessor;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\Models\Action;
use Helm\StellarWP\Models\Model;
use InvalidArgumentException;
use ReflectionMethod;
use Tests\Support\TestCase;

class ActionCommandTest extends TestCase
{
    private ActionRepository $repository;
    private ActionCommand $command;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = $this->container->get(ActionRepository::class);
        $this->command = new ActionCommand(
            $this->container->get(ActionProcessor::class),
            $this->repository
        );

        Date::setTestNow(new DateTimeImmutable('2026-05-30 12:00:00'));
    }

    protected function tearDown(): void
    {
        Date::setTestNow(null);

        parent::tearDown();
    }

    public function test_prune_uses_default_thirty_day_retention(): void
    {
        $old = $this->insertAction(ActionStatus::Fulfilled, '2026-04-29 00:00:00');
        $recent = $this->insertAction(ActionStatus::Fulfilled, '2026-05-02 00:00:00');

        $this->command->prune([], []);

        $this->assertNull($this->repository->find($old->id));
        $this->assertNotNull($this->repository->find($recent->id));
    }

    public function test_prune_uses_custom_day_retention(): void
    {
        $old = $this->insertAction(ActionStatus::Fulfilled, '2026-05-19 00:00:00');
        $recent = $this->insertAction(ActionStatus::Fulfilled, '2026-05-24 00:00:00');

        $this->command->prune([], ['days' => '7']);

        $this->assertNull($this->repository->find($old->id));
        $this->assertNotNull($this->repository->find($recent->id));
    }

    public function test_prune_preserves_pending_and_running_actions(): void
    {
        $fulfilled = $this->insertAction(ActionStatus::Fulfilled, '2026-04-29 00:00:00');
        $partial = $this->insertAction(ActionStatus::Partial, '2026-04-29 00:00:00');
        $failed = $this->insertAction(ActionStatus::Failed, '2026-04-29 00:00:00');
        $pending = $this->insertAction(ActionStatus::Pending, '2026-04-29 00:00:00');
        $running = $this->insertAction(ActionStatus::Running, '2026-04-29 00:00:00');

        $this->command->prune([], []);

        $this->assertNull($this->repository->find($fulfilled->id));
        $this->assertNull($this->repository->find($partial->id));
        $this->assertNull($this->repository->find($failed->id));
        $this->assertNotNull($this->repository->find($pending->id));
        $this->assertNotNull($this->repository->find($running->id));
    }

    public function test_prune_rejects_non_positive_days(): void
    {
        $method = new ReflectionMethod(ActionCommand::class, 'parsePruneDays');
        $method->setAccessible(true);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Days must be a positive integer');

        $method->invoke($this->command, ['days' => '0']);
    }

    private function insertAction(ActionStatus $status, string $updatedAt): Action
    {
        $action = Action::fromData([
            'ship_post_id' => 123,
            'type' => 'scan_route',
            'status' => $status->value,
            'params' => '{}',
        ], Model::BUILD_MODE_IGNORE_MISSING);

        $this->repository->insert($action);

        global $wpdb;
        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;
        $wpdb->update(
            $table,
            ['updated_at' => $updatedAt],
            ['id' => $action->id]
        );

        return $action;
    }
}
