<?php

declare(strict_types=1);

namespace Helm\Abilities\Player;

use Helm\Core\ErrorCode;
use Helm\Navigation\NavigationService;
use Helm\Rest\ShipActionsController;
use Helm\ShipLink\ShipFactory;
use WP_Error;
use WP_REST_Request;

/** Read-only planning over the authenticated player's discovered graph. */
final class PlanRoute
{
    public function __construct(
        private readonly ShipFactory $ships,
        private readonly NavigationService $navigation,
        private readonly ShipActionsController $permissions,
    ) {
    }

    public function register(): void
    {
        $id = ['type' => 'integer', 'minimum' => 1];
        $distance = ['type' => 'number', 'minimum' => 0];
        $leg = [
            'type' => 'object',
            'properties' => ['edge_id' => $id, 'from_node_id' => $id, 'to_node_id' => $id, 'distance_ly' => $distance],
            'required' => ['edge_id', 'from_node_id', 'to_node_id', 'distance_ly'],
            'additionalProperties' => false,
        ];
        $properties = [
            'ship_id' => $id,
            'from_node_id' => $id,
            'target_node_id' => $id,
            'reachable' => ['type' => 'boolean'],
            'already_at_target' => ['type' => 'boolean'],
            'direct' => ['type' => 'boolean', 'description' => 'Whether the selected shortest path uses exactly one edge.'],
            'node_ids' => ['type' => 'array', 'items' => $id],
            'route' => ['type' => 'array', 'items' => $id, 'description' => 'Ordered edge IDs for the jump ability; empty when unreachable or already at target.'],
            'legs' => ['type' => 'array', 'items' => $leg],
            'total_distance_ly' => ['type' => ['number', 'null'], 'minimum' => 0],
            'straight_line_distance_ly' => $distance,
            'potential_saving_ly' => ['type' => ['number', 'null'], 'description' => 'Known path distance minus straight-line distance; null when unreachable. A hypothetical comparison, not a predicted scan outcome.'],
        ];
        wp_register_ability('helm/plan-route', [
            'label' => __('Plan a known route', 'helm'),
            'description' => __('Find the shortest player-discovered path by distance from an owned ship to a target node. Returns ordered nodes, jump-compatible route edge IDs, and directed legs. Straight-line savings describe a hypothetical shortcut; scanning may not discover it. This does not check ship range, core, duration, or availability, and does not start a jump or scan. Search-limit errors mean reachability is undetermined.', 'helm'),
            'category' => 'helm',
            'input_schema' => [
                'type' => 'object',
                'properties' => ['ship_id' => $id, 'target_node_id' => $id],
                'required' => ['ship_id', 'target_node_id'],
                'additionalProperties' => false,
            ],
            'output_schema' => [
                'type' => 'object', 'properties' => $properties,
                'required' => array_keys($properties), 'additionalProperties' => false,
            ],
            'execute_callback' => [$this, 'execute'],
            'permission_callback' => [$this, 'canExecute'],
            'meta' => [
                'show_in_rest' => true, 'public' => true, 'mcp' => ['public' => true],
                'annotations' => ['readonly' => true, 'destructive' => false, 'idempotent' => true],
            ],
        ]);
    }

    /** @param array<string, mixed> $input */
    public function canExecute(array $input): bool|WP_Error
    {
        if (! isset($input['ship_id'])) {
            return ErrorCode::InputShipIdRequired->error(__('ship_id is required. Use helm/list-ships to find your ship ID.', 'helm'), ['status' => ErrorCode::InputShipIdRequired->httpStatus()]);
        }
        /** @var WP_REST_Request<array<string, mixed>> $request */
        $request = new WP_REST_Request();
        $request->set_param('id', $input['ship_id']);
        return $this->permissions->permissions($request);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>|WP_Error
     */
    public function execute(array $input): array|WP_Error
    {
        $shipId = (int) $input['ship_id'];
        $target = (int) $input['target_node_id'];
        $origin = $this->ships->build($shipId)->navigation()->getCurrentPosition();
        if ($origin === null) {
            return ErrorCode::ShipNoPosition->error(__('Ship has no node position from which to plan a route.', 'helm'), ['ship_id' => $shipId]);
        }
        $userId = get_current_user_id();
        $path = $this->navigation->findKnownPath($userId, $origin, $target);
        if ($path instanceof WP_Error) {
            return $path;
        }
        $legs = [];
        if ($path->edgeIds !== []) {
            $edges = $this->navigation->getRouteEdges($userId, $path->edgeIds);
            if ($edges instanceof WP_Error) {
                return $edges;
            }
            foreach ($edges as $index => $edge) {
                $legs[] = [
                    'edge_id' => $edge->edgeId,
                    'from_node_id' => $path->nodeIds[$index],
                    'to_node_id' => $path->nodeIds[$index + 1],
                    'distance_ly' => $edge->distance,
                ];
            }
        }
        $directDistance = $this->navigation->calculateDistance($origin, $target);
        if ($directDistance === null) {
            return ErrorCode::NavigationInvalidTarget->error(__('Route endpoints are no longer available.', 'helm'));
        }
        return [
            'ship_id' => $shipId, 'from_node_id' => $origin, 'target_node_id' => $target,
            'reachable' => $path->reachable, 'already_at_target' => $origin === $target,
            'direct' => $path->direct, 'node_ids' => $path->nodeIds, 'route' => $path->edgeIds,
            'legs' => $legs, 'total_distance_ly' => $path->reachable ? $path->totalDistance : null,
            'straight_line_distance_ly' => $directDistance,
            'potential_saving_ly' => $path->reachable ? $path->totalDistance - $directDistance : null,
        ];
    }
}
