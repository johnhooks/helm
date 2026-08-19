<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\ScanRoute;

use Helm\Core\ErrorCode;
use Helm\Navigation\NavigationService;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\Contracts\ActionValidator;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Ship;

/**
 * Validates route scan actions.
 *
 * Checks:
 * - Target node is specified and exists
 * - Ship has a current position at a valid node
 * - Ship is not already at target
 * - Target is within supported scan range
 *
 * Captures the ship's current position into params as `from_node_id`
 * so the scan intent is recorded at creation time.
 */
final class Validator implements ActionValidator
{
    public function __construct(
        private readonly NavigationService $navigationService,
    ) {
    }

    public function validate(Action $action, Ship $ship): void
    {
        $targetNodeId = $action->get('target_node_id');

        if ($targetNodeId === null) {
            throw new ActionException(
                ErrorCode::NavigationMissingTarget,
                __('No destination selected', 'helm')
            );
        }

        $fromNodeId = $ship->navigation()->getCurrentPosition();

        if ($fromNodeId === null) {
            throw new ActionException(
                ErrorCode::ShipNoPosition,
                __('Ship must be at a location before scanning', 'helm')
            );
        }

        $params = $action->params;
        $params['from_node_id'] = $fromNodeId;
        $action->params = $params;

        $targetNodeId = (int) $targetNodeId;

        if ($fromNodeId === $targetNodeId) {
            throw new ActionException(
                ErrorCode::NavigationAlreadyAtTarget,
                __('Already at this location', 'helm')
            );
        }

        if ($this->navigationService->getNode($fromNodeId) === null) {
            throw new ActionException(
                ErrorCode::NavigationInvalidNode,
                __('Ship is not at a valid navigation node', 'helm')
            );
        }

        if ($this->navigationService->getNode($targetNodeId) === null) {
            throw new ActionException(
                ErrorCode::NavigationInvalidTarget,
                __('Destination is not a valid navigation node', 'helm')
            );
        }

        $distance = $this->navigationService->calculateDistance($fromNodeId, $targetNodeId);
        if ($distance === null || ! $ship->sensors()->canScan($distance)) {
            throw new ActionException(
                ErrorCode::NavigationBeyondRange,
                __('Destination is beyond scan range', 'helm')
            );
        }
    }
}
