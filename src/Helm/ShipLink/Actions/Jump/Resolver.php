<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\Jump;

use Helm\ShipLink\Contracts\ActionHandler;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Ship;

/**
 * Resolves jump actions.
 *
 * Executes the jump using values calculated at creation time.
 * No re-validation - the player committed to this action, it completes.
 */
final class Resolver implements ActionHandler
{
    public function handle(Action $action, Ship $ship): void
    {
        // Read values calculated by Handler
        $result = $action->result ?? [];
        $targetNodeId = $result['to_node_id'] ?? $action->get('target_node_id');
        $coreCost = $result['core_cost'] ?? 0.0;

        // Execute the jump - core life on component, node_id on state
        $coreComponent = $ship->getLoadout()->core()->component();
        $currentCoreLife = $coreComponent->life ?? 0;
        $newCoreLife = max(0, $currentCoreLife - (int) ceil($coreCost));

        $ship->getState()->node_id = $targetNodeId;
        $coreComponent->life = $newCoreLife;

        // Update action result with final values
        $result['remaining_core_life'] = $newCoreLife;
        $result['core_before'] = $currentCoreLife;
        $action->result = $result;
    }
}
