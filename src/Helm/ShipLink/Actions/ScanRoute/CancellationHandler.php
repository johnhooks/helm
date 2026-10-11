<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\ScanRoute;

use Helm\ShipLink\Contracts\ActionHandler;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Ship;

/**
 * End scanning without executing or charging the pending cycle.
 */
final class CancellationHandler implements ActionHandler
{
    public function handle(Action $action, Ship $ship): void
    {
        $result = [...($action->result ?? []), 'stop_reason' => StopReason::PlayerStopped->value];
        if (($result['discovered_edge_ids'] ?? []) !== []) {
            $action->partial($result);
        } else {
            $action->fulfill($result);
        }
        $action->deferred_until = null;
    }
}
