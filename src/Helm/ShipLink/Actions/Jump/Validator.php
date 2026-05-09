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
 * - Source and target nodes are specified
 * - Ship has a current position
 * - Ship is not already at target
 * - Planned route edge IDs are known by the ship owner and connect in order
 */
final class Validator implements ActionValidator
{
    public function validate(Action $action, Ship $ship): void
    {
        $fromNodeId = $action->get('from_node_id');
        $targetNodeId = $action->get('target_node_id');
        $route = $action->get('route');

        if ($fromNodeId === null || $targetNodeId === null) {
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

        if ((int) $fromNodeId !== $currentNodeId) {
            throw new ActionException(
                ErrorCode::NavigationNoRoute,
                __('Route plan does not start at current position', 'helm')
            );
        }

        if ($currentNodeId === $targetNodeId) {
            throw new ActionException(
                ErrorCode::NavigationAlreadyAtTarget,
                __('Already at this location', 'helm')
            );
        }

        if (!is_array($route) || count($route) === 0) {
            throw new ActionException(
                ErrorCode::NavigationNoRoute,
                __('Route plan is invalid', 'helm')
            );
        }

        $routeValidation = $ship->navigation()->getRouteEdges((int) $fromNodeId, (int) $targetNodeId, $this->routeEdgeIds($route));
        if (is_wp_error($routeValidation)) {
            throw new ActionException(
                ErrorCode::NavigationNoRoute,
                $routeValidation->get_error_message()
            );
        }
    }

    /**
     * @param array<mixed> $route
     * @return int[]
     */
    private function routeEdgeIds(array $route): array
    {
        $edgeIds = [];

        foreach ($route as $edgeId) {
            $edgeId = (int) $edgeId;
            if ($edgeId <= 0) {
                throw new ActionException(
                    ErrorCode::NavigationNoRoute,
                    __('Route plan is invalid', 'helm')
                );
            }

            $edgeIds[] = $edgeId;
        }

        return $edgeIds;
    }
}
