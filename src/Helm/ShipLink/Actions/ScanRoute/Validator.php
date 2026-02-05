<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\ScanRoute;

use Helm\Core\ErrorCode;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\Contracts\ActionValidator;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Ship;

/**
 * Validates route scan actions.
 *
 * Checks:
 * - Target node is specified
 * - Ship has a current position
 * - Ship is not already at target
 */
final class Validator implements ActionValidator
{
    public function validate(Action $action, Ship $ship): void
    {
        $targetNodeId = $action->get('target_node_id');

        if ($targetNodeId === null) {
            throw new ActionException(
                ErrorCode::NavigationMissingTarget,
                __('No destination selected', 'helm')
            );
        }

        $currentNodeId = $ship->navigation()->getCurrentPosition();

        if ($currentNodeId === null) {
            throw new ActionException(
                ErrorCode::ShipNoPosition,
                __('Ship must be at a location before scanning', 'helm')
            );
        }

        if ($currentNodeId === $targetNodeId) {
            throw new ActionException(
                ErrorCode::NavigationAlreadyAtTarget,
                __('Already at this location', 'helm')
            );
        }
    }
}
