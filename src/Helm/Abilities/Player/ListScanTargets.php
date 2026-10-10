<?php

declare(strict_types=1);

namespace Helm\Abilities\Player;

use Helm\Core\ErrorCode;
use Helm\Abilities\Support\Schemas;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\NavigationService;
use Helm\Navigation\NearbyStar;
use Helm\Rest\ShipActionsController;
use Helm\ShipLink\ShipFactory;
use WP_Error;
use WP_REST_Request;

final class ListScanTargets
{
    public function __construct(
        private readonly ShipFactory $ships,
        private readonly NavigationService $navigation,
        private readonly UserEdgeRepository $edges,
        private readonly ShipActionsController $permissions,
    ) {
    }

    public function register(): void
    {
        $id = ['type' => 'integer', 'minimum' => 1];
        $page = ['type' => 'integer', 'minimum' => 1, 'default' => 1];
        $perPage = ['type' => 'integer', 'minimum' => 1, 'maximum' => UserEdgeRepository::MAX_NODE_IDS, 'default' => 20];
        $ship = ['ship_id' => $id];

        wp_register_ability('helm/list-scan-targets', [
            'label' => __('List nearby scan targets', 'helm'),
            'description' => __('List star systems within this ship\'s effective sensor range, nearest first. has_discovered_route indicates a direct connection from the current node discovered by this player, not indirect reachability or previous scan attempts. has_any_discovered_route indicates any edge discovered by this player touching the target, even in a disconnected part of the graph.', 'helm'),
            'category' => 'helm',
            'input_schema' => [
                'type' => 'object',
                'properties' => $ship + ['page' => $page, 'per_page' => $perPage],
                'required' => ['ship_id'],
                'additionalProperties' => false,
            ],
            'output_schema' => Schemas::collection('targets', [
                'type' => 'object',
                'properties' => ['node_id' => $id, 'name' => ['type' => 'string'], 'distance_ly' => ['type' => 'number'], 'has_discovered_route' => ['type' => 'boolean'], 'has_any_discovered_route' => ['type' => 'boolean']],
                'required' => ['node_id', 'name', 'distance_ly', 'has_discovered_route', 'has_any_discovered_route'],
            ]),
            'execute_callback' => [$this, 'execute'],
            'permission_callback' => [$this, 'canExecute'],
            'meta' => [
                'show_in_rest' => true,
                'public' => true,
                'mcp' => ['public' => true],
                'annotations' => [
                    'readonly' => true,
                    'destructive' => false,
                    'idempotent' => true,
                ],
            ],
        ]);
    }

    /** @param array<string, mixed> $input */
    public function canExecute(array $input): bool|WP_Error
    {
        if (! isset($input['ship_id'])) {
            return ErrorCode::InputShipIdRequired->error('ship_id is required. Use helm/list-ships to find your ship ID.', ['status' => ErrorCode::InputShipIdRequired->httpStatus()]);
        }
        /** @var WP_REST_Request<array<string, mixed>> $request */
        $request = new WP_REST_Request();
        $request->set_param('id', $input['ship_id']);
        return $this->permissions->permissions($request);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function execute(array $input): array
    {
        $ship = $this->ships->build((int) $input['ship_id']);
        $nodeId = $ship->navigation()->getCurrentPosition();
        $targets = $nodeId === null ? [] : $this->navigation->getNearbyStars($nodeId, $ship->sensors()->getRange());
        $page = (int) ($input['page'] ?? 1);
        $perPage = (int) ($input['per_page'] ?? 20);
        $pageTargets = array_slice($targets, ($page - 1) * $perPage, $perPage);
        $targetIds = array_map(static fn (NearbyStar $target): int => $target->node->id, $pageTargets);
        $discovered = $nodeId === null || $pageTargets === [] ? [] : $this->edges->discoveredTargets(
            get_current_user_id(),
            $nodeId,
            $targetIds
        );
        $known = array_fill_keys($discovered, true);
        $anyKnown = array_fill_keys(
            $targetIds === [] ? [] : $this->edges->nodesWithDiscoveredEdges(get_current_user_id(), $targetIds),
            true
        );
        return [
            'targets' => array_map(static fn (NearbyStar $target): array => [
                'node_id' => $target->node->id,
                'name' => $target->star->displayName(),
                'distance_ly' => $target->distance,
                'has_discovered_route' => isset($known[$target->node->id]),
                'has_any_discovered_route' => isset($anyKnown[$target->node->id]),
            ], $pageTargets),
            'total' => count($targets), 'page' => $page,
            'has_more' => $page * $perPage < count($targets),
        ];
    }
}
