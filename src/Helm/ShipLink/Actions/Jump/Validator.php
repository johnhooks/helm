<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\Jump;

use Helm\Core\ErrorCode;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\Contracts\ActionValidator;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Ship;

/**
 * Validates jump actions.
 *
 * Checks:
 * - Target node is specified
 * - Ship has a current position
 * - Ship is not already at target
 * - Route exists to target
 * - Ship has enough core life for the jump
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
                __('Ship must be at a location before jumping', 'helm')
            );
        }

        if ($currentNodeId === $targetNodeId) {
            throw new ActionException(
                ErrorCode::NavigationAlreadyAtTarget,
                __('Already at this location', 'helm')
            );
        }

        // Verify route exists
        $routeInfo = $ship->navigation()->getRouteInfo($targetNodeId);
        if (is_wp_error($routeInfo)) {
            throw new ActionException(
                ErrorCode::NavigationNoRoute,
                __('No known route to destination', 'helm')
            );
        }

        // Check core life
        $coreCost = $ship->propulsion()->calculateCoreCost($routeInfo->distance);
        $coreLife = $ship->power()->getCoreLife();

        if ($coreCost > $coreLife) {
            throw new ActionException(
                ErrorCode::ShipInsufficientCore,
                sprintf(
                    /* translators: %1$.1f: required core life, %2$.1f: available core life */
                    __('Core life too low for this jump (need %1$.1f, have %2$.1f)', 'helm'),
                    $coreCost,
                    $coreLife
                )
            );
        }
    }
}
