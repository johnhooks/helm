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
 * Calculates scan parameters and stores them in result for the resolver.
 * This is the commitment point - all data needed to execute is captured here.
 */
final class Handler implements ActionHandler
{
    private const SCAN_CYCLE_SECONDS = 300;
    private const MAX_SCAN_PHASES = 50;

    public function handle(Action $action, Ship $ship): void
    {
        $targetNodeId = $action->get('target_node_id');
        $currentNodeId = $ship->navigation()->getCurrentPosition();

        // Capture nav computer stats at creation time
        $skill = $ship->navigation()->getSkill();
        $efficiency = $ship->navigation()->getEfficiency();

        $startedAt = Date::now();
        $firstCheckpointAt = Date::addSeconds($startedAt, self::SCAN_CYCLE_SECONDS);

        // Store calculated values in result - resolver will use these
        $action->result = [
            'from_node_id' => $currentNodeId,
            'to_node_id' => $targetNodeId,
            'skill' => $skill,
            'efficiency' => $efficiency,
            'started_at' => Date::toString($startedAt),
            'cycle_seconds' => self::SCAN_CYCLE_SECONDS,
            'max_scan_phases' => self::MAX_SCAN_PHASES,
            'duration' => self::SCAN_CYCLE_SECONDS,
            'phases' => [],
        ];

        $action->status = ActionStatus::Pending;
        $action->deferred_until = $firstCheckpointAt;
    }
}
