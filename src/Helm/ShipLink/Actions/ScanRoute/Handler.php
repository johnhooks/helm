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
    private const SCAN_DURATION_SECONDS = 3600; // 1 hour base scan time

    public function handle(Action $action, Ship $ship): void
    {
        $targetNodeId = $action->get('target_node_id');
        $currentNodeId = $ship->navigation()->getCurrentPosition();

        // Capture nav computer stats at creation time
        $skill = $ship->navigation()->getSkill();
        $efficiency = $ship->navigation()->getEfficiency();

        // Calculate scan duration
        $durationSeconds = (int) (self::SCAN_DURATION_SECONDS / max(0.1, $efficiency));
        $completesAt = Date::addSeconds(Date::now(), $durationSeconds);

        // Store calculated values in result - resolver will use these
        $action->result = [
            'from_node_id' => $currentNodeId,
            'to_node_id' => $targetNodeId,
            'skill' => $skill,
            'efficiency' => $efficiency,
            'duration' => $durationSeconds,
        ];

        $action->status = ActionStatus::Pending;
        $action->deferred_until = $completesAt;
    }
}
