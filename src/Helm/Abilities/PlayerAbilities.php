<?php

declare(strict_types=1);

namespace Helm\Abilities;

use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\NavigationService;
use Helm\PostTypes\PostTypeRegistry;
use Helm\Rest\ShipActionsController;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\ActionFactory;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\Resources\ActionResource;
use Helm\ShipLink\Resources\ShipStateResource;
use Helm\ShipLink\ShipFactory;
use WP_Error;
use WP_Post;
use WP_REST_Request;

/**
 * Player-facing operations. Execution uses the authenticated WordPress user.
 */
final class PlayerAbilities
{
    public function __construct(
        private readonly ShipFactory $ships,
        private readonly ActionFactory $actions,
        private readonly ActionRepository $actionRepository,
        private readonly UserEdgeRepository $edges,
        private readonly NavigationService $navigation,
        private readonly ShipActionsController $permissions,
    ) {
    }

    public function register(): void
    {
        $id = ['type' => 'integer', 'minimum' => 1];
        $page = ['type' => 'integer', 'minimum' => 1, 'default' => 1];
        $perPage = ['type' => 'integer', 'minimum' => 1, 'maximum' => 100, 'default' => 20];
        $ship = ['ship_id' => $id];
        $target = $ship + ['target_node_id' => $id];
        $object = ['type' => 'object'];
        $action = self::actionSchema();

        $this->add(
            'list-ships',
            __('List my ships', 'helm'),
            __('List ships owned by the authenticated player. Use the returned ship_id with the other Helm abilities.', 'helm'),
            ['page' => $page, 'per_page' => $perPage],
            [],
            self::collectionSchema('ships', [
                'type' => 'object',
                'properties' => ['ship_id' => $id, 'name' => ['type' => 'string']],
                'required' => ['ship_id', 'name'],
            ]),
            'listShips',
            'canRead',
            true
        );

        $this->add(
            'inspect-ship',
            __('Inspect my ship', 'helm'),
            __('Read current ship state, available power, remaining core life, and effective sensor and jump ranges. current_action_id identifies any active action.', 'helm'),
            $ship,
            ['ship_id'],
            [
                'type' => 'object',
                'properties' => [
                    'ship_id' => $id, 'name' => ['type' => 'string'], 'state' => $object,
                    'power' => ['type' => 'number'], 'core_life' => ['type' => 'number'],
                    'sensor_range_ly' => ['type' => 'number'], 'jump_range_ly' => ['type' => 'number'],
                ],
                'required' => ['ship_id', 'name', 'state', 'power', 'core_life', 'sensor_range_ly', 'jump_range_ly'],
            ],
            'inspectShip',
            'canUseShip',
            true
        );

        $this->add(
            'list-scan-targets',
            __('List nearby scan targets', 'helm'),
            __('List star systems within this ship\'s effective sensor range, nearest first. A listed target is not necessarily connected by a discovered route.', 'helm'),
            $ship + ['page' => $page, 'per_page' => $perPage],
            ['ship_id'],
            self::collectionSchema('targets', [
                'type' => 'object',
                'properties' => ['node_id' => $id, 'name' => ['type' => 'string'], 'distance_ly' => ['type' => 'number']],
                'required' => ['node_id', 'name', 'distance_ly'],
            ]),
            'listScanTargets',
            'canUseShip',
            true
        );

        $this->add(
            'list-known-edges',
            __('List my discovered routes', 'helm'),
            __('List only the authenticated player\'s discovered navigation edges. Edges connect node_a_id and node_b_id in either direction. Supply an ordered, connected list of their IDs when submitting a jump. Read every page when planning a multi-leg route.', 'helm'),
            ['page' => $page, 'per_page' => $perPage],
            [],
            self::collectionSchema('edges', [
                'type' => 'object',
                'properties' => ['id' => $id, 'node_a_id' => $id, 'node_b_id' => $id, 'distance_ly' => ['type' => 'number']],
                'required' => ['id', 'node_a_id', 'node_b_id', 'distance_ly'],
            ]),
            'listKnownEdges',
            'canRead',
            true
        );

        $this->add(
            'scan-route',
            __('Submit a route scan', 'helm'),
            __('Queue a real route scan from your ship\'s current position. Normal range, busy-ship, timing, and resource rules apply. Returns an action immediately; use get-action after deferred_until to check progress. Submission is not idempotent: do not blindly retry after a transport timeout; inspect the ship\'s current action first.', 'helm'),
            $target,
            ['ship_id', 'target_node_id'],
            $action,
            'scanRoute',
            'canUseShip',
            false
        );

        $this->add(
            'jump',
            __('Submit a jump', 'helm'),
            __('Queue a real jump along an explicit route of discovered edge IDs, in travel order, from from_node_id to target_node_id. Normal validation, resource costs, and scheduling apply. This is not a teleport. Returns an action immediately. Do not blindly retry after a transport timeout; inspect the ship\'s current action first.', 'helm'),
            $target + ['from_node_id' => $id, 'route' => ['type' => 'array', 'items' => $id, 'minItems' => 1, 'maxItems' => 500]],
            ['ship_id', 'target_node_id', 'from_node_id', 'route'],
            $action,
            'jump',
            'canUseShip',
            false
        );

        $this->add(
            'get-action',
            __('Inspect my action', 'helm'),
            __('Read an action belonging to one of your ships, including status, public progress, and the next scheduled checkpoint. This read does not process or accelerate the action. Private scan rolls and runtime history are never returned.', 'helm'),
            ['action_id' => $id],
            ['action_id'],
            $action,
            'getAction',
            'canReadAction',
            true
        );
    }

    /**
     * @param array<string, mixed> $properties
     * @param list<string> $required
     * @param array<string, mixed> $output
     */
    private function add(string $name, string $label, string $description, array $properties, array $required, array $output, string $execute, string $permission, bool $readonly): void
    {
        wp_register_ability('helm/' . $name, [
            'label' => $label,
            'description' => $description,
            'category' => 'helm',
            'input_schema' => [
                'type' => 'object', 'properties' => $properties,
                'required' => $required, 'additionalProperties' => false,
            ],
            'output_schema' => $output,
            'execute_callback' => [$this, $execute],
            'permission_callback' => [$this, $permission],
            'meta' => [
                'show_in_rest' => true,
                'public' => true,
                'mcp' => ['public' => true],
                'annotations' => [
                    'readonly' => $readonly,
                    'destructive' => ! $readonly,
                    'idempotent' => $readonly,
                ],
            ],
        ]);
    }

    public function canRead(): bool
    {
        return is_user_logged_in();
    }

    /** @param array<string, mixed> $input */
    public function canUseShip(array $input): bool|WP_Error
    {
        /** @var WP_REST_Request<array<string, mixed>> $request */
        $request = new WP_REST_Request();
        $request->set_param('id', $input['ship_id']);
        return $this->permissions->permissions($request);
    }

    /** @param array<string, mixed> $input */
    public function canReadAction(array $input): bool|WP_Error
    {
        /** @var WP_REST_Request<array<string, mixed>> $request */
        $request = new WP_REST_Request();
        $request->set_param('actionId', $input['action_id']);
        return $this->permissions->actionPermissions($request);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function listShips(array $input): array
    {
        $page = (int) ($input['page'] ?? 1);
        $perPage = (int) ($input['per_page'] ?? 20);
        $query = new \WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_SHIP,
            'author' => get_current_user_id(),
            'post_status' => 'publish',
            'posts_per_page' => $perPage,
            'paged' => $page,
            'orderby' => 'ID', 'order' => 'ASC',
        ]);
        return [
            'ships' => array_map(static fn (WP_Post $post): array => [
                'ship_id' => $post->ID, 'name' => $post->post_title,
            ], $query->posts),
            'total' => $query->found_posts,
            'page' => $page,
            'has_more' => $page < $query->max_num_pages,
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function inspectShip(array $input): array
    {
        $ship = $this->ships->build((int) $input['ship_id']);
        return [
            'ship_id' => $ship->getId(),
            'name' => $ship->getName(),
            'state' => (new ShipStateResource($ship->getState()))->resolve(),
            'power' => $ship->power()->getCurrentPower(),
            'core_life' => $ship->power()->getCoreLife(),
            'sensor_range_ly' => $ship->sensors()->getRange(),
            'jump_range_ly' => $ship->propulsion()->getMaxRange(),
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function listScanTargets(array $input): array
    {
        $ship = $this->ships->build((int) $input['ship_id']);
        $nodeId = $ship->navigation()->getCurrentPosition();
        $targets = $nodeId === null ? [] : $this->navigation->getNearbyStars($nodeId, $ship->sensors()->getRange());
        $page = (int) ($input['page'] ?? 1);
        $perPage = (int) ($input['per_page'] ?? 20);
        return [
            'targets' => array_map(static fn (\Helm\Navigation\NearbyStar $target): array => [
                'node_id' => $target->node->id,
                'name' => $target->star->displayName(),
                'distance_ly' => $target->distance,
            ], array_slice($targets, ($page - 1) * $perPage, $perPage)),
            'total' => count($targets), 'page' => $page,
            'has_more' => $page * $perPage < count($targets),
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function listKnownEdges(array $input): array
    {
        $page = (int) ($input['page'] ?? 1);
        $perPage = (int) ($input['per_page'] ?? 20);
        $result = $this->edges->paginate(get_current_user_id(), $page, $perPage);
        return [
            'edges' => array_map(static fn (\Helm\Navigation\UserEdge $edge): array => [
                'id' => $edge->edgeId, 'node_a_id' => $edge->nodeAId,
                'node_b_id' => $edge->nodeBId, 'distance_ly' => $edge->distance,
            ], $result['edges']),
            'total' => $result['total'], 'page' => $page,
            'has_more' => $page * $perPage < $result['total'],
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>|WP_Error
     */
    public function scanRoute(array $input): array|WP_Error
    {
        return $this->submit((int) $input['ship_id'], ActionType::ScanRoute, ['target_node_id' => (int) $input['target_node_id']]);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>|WP_Error
     */
    public function jump(array $input): array|WP_Error
    {
        return $this->submit((int) $input['ship_id'], ActionType::Jump, [
            'from_node_id' => (int) $input['from_node_id'],
            'target_node_id' => (int) $input['target_node_id'],
            'route' => $input['route'],
        ]);
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>|WP_Error
     */
    private function submit(int $shipId, ActionType $type, array $params): array|WP_Error
    {
        try {
            return (new ActionResource($this->actions->create($shipId, $type, $params)))->resolve();
        } catch (ActionException $error) {
            $result = $error->toWpError();
            $result->add_data(['status' => $error->errorCode->httpStatus()]);
            return $result;
        }
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>|WP_Error
     */
    public function getAction(array $input): array|WP_Error
    {
        $action = $this->actionRepository->find((int) $input['action_id']);
        if ($action === null) {
            return new WP_Error('helm.action.not_found', __('Action not found.', 'helm'), ['status' => 404]);
        }
        return (new ActionResource($action))->resolve();
    }

    /**
     * @param array<string, mixed> $item
     * @return array<string, mixed>
     */
    private static function collectionSchema(string $key, array $item): array
    {
        return [
            'type' => 'object',
            'properties' => [
                $key => ['type' => 'array', 'items' => $item],
                'total' => ['type' => 'integer'], 'page' => ['type' => 'integer'],
                'has_more' => ['type' => 'boolean'],
            ],
            'required' => [$key, 'total', 'page', 'has_more'],
        ];
    }

    /** @return array<string, mixed> */
    private static function actionSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'id' => ['type' => 'integer'], 'ship_post_id' => ['type' => 'integer'],
                'type' => ['type' => 'string'],
                'status' => ['type' => 'string', 'enum' => ['pending', 'running', 'fulfilled', 'partial', 'failed']],
                'params' => ['type' => 'object'], 'result' => ['type' => ['object', 'null']],
                'deferred_until' => ['type' => ['string', 'null']],
                'created_at' => ['type' => 'string'], 'updated_at' => ['type' => 'string'],
            ],
            'required' => ['id', 'ship_post_id', 'type', 'status', 'params', 'result', 'deferred_until', 'created_at', 'updated_at'],
            'additionalProperties' => false,
        ];
    }
}
