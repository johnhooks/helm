<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\ScanRoute;

use Helm\Lib\Date;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\Contracts\ActionHandler;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Ship;

/**
 * Handles route scan action creation.
 *
 * Seeds the private runtime state and schedules the first scan cycle.
 * Params carry the stable scan intent; public results accumulate on discovery.
 */
final class Handler implements ActionHandler
{
    private const SCAN_CYCLE_SECONDS = 300;
    private const MAX_SCAN_CYCLES = 50;

    public function handle(Action $action, Ship $ship): void
    {
        $startedAt = Date::now();

        $state = RuntimeState::start(
            cycleSeconds: self::SCAN_CYCLE_SECONDS,
            maxCycles: self::MAX_SCAN_CYCLES,
            startedAt: $startedAt,
        );

        $action->runtime_state = $state->toArray();
        $action->status = ActionStatus::Pending;
        $action->deferred_until = $state->checkpointAt();
    }
}
