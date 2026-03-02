<?php

declare(strict_types=1);

namespace Helm\Rest;

use Helm\Core\ErrorCode;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\ActionFactory;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\Models\Action;
use Helm\Ships\ShipPost;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * REST controller for ship actions.
 *
 * GET    /helm/v1/actions/{actionId}
 * GET    /helm/v1/ships/{id}/actions
 * POST   /helm/v1/ships/{id}/actions
 * GET    /helm/v1/ships/{id}/actions/{actionId}
 */
final class ShipActionsController
{
    private const NAMESPACE = 'helm/v1';
    private const ROUTE     = '/ships/(?P<id>\d+)/actions';

    public function __construct(
        private readonly ActionFactory $actionFactory,
        private readonly ActionRepository $actionRepository,
    ) {
    }

    /**
     * Register REST routes.
     */
    public function register(): void
    {
        register_rest_route(
            self::NAMESPACE,
            self::ROUTE,
            [
                [
                    'methods'             => 'GET',
                    'callback'            => [$this, 'index'],
                    'permission_callback' => [$this, 'permissions'],
                    'args'                => [
                        'per_page' => [
                            'required'          => false,
                            'type'              => 'integer',
                            'default'           => 20,
                            'minimum'           => 1,
                            'maximum'           => 100,
                            'sanitize_callback' => 'absint',
                        ],
                        'before'   => [
                            'required'          => false,
                            'type'              => 'integer',
                            'minimum'           => 1,
                            'sanitize_callback' => 'absint',
                        ],
                    ],
                ],
                [
                    'methods'             => 'POST',
                    'callback'            => [$this, 'create'],
                    'permission_callback' => [$this, 'permissions'],
                    'args'                => [
                        'type'   => [
                            'required'          => true,
                            'type'              => 'string',
                            'validate_callback' => static function ($value): bool {
                                return ActionType::tryFrom($value) !== null;
                            },
                        ],
                        'params' => [
                            'required' => false,
                            'type'     => 'object',
                            'default'  => [],
                        ],
                    ],
                ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            self::ROUTE . '/(?P<actionId>\d+)',
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'show'],
                'permission_callback' => [$this, 'permissions'],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/actions/(?P<actionId>\d+)',
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'showById'],
                'permission_callback' => [$this, 'actionPermissions'],
            ]
        );
    }

    /**
     * Permission callback.
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     * @return true|WP_Error
     */
    public function permissions(WP_REST_Request $request)
    {
        if (! is_user_logged_in()) {
            return new WP_Error(
                'rest_not_logged_in',
                __('You must be logged in.', 'helm'),
                ['status' => 401]
            );
        }

        $ship = ShipPost::fromId((int) $request->get_param('id'));

        if ($ship === null) {
            return ErrorCode::ShipNotFound->error(
                __('Ship not found.', 'helm'),
                ['status' => ErrorCode::ShipNotFound->httpStatus()]
            );
        }

        if ($ship->ownerId() !== get_current_user_id()) {
            return new WP_Error(
                'rest_forbidden',
                __('You do not own this ship.', 'helm'),
                ['status' => 403]
            );
        }

        return true;
    }

    /**
     * Permission callback for action-by-ID routes.
     *
     * Looks up the action, then checks ownership via its ship.
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     * @return true|WP_Error
     */
    public function actionPermissions(WP_REST_Request $request)
    {
        if (! is_user_logged_in()) {
            return new WP_Error(
                'rest_not_logged_in',
                __('You must be logged in.', 'helm'),
                ['status' => 401]
            );
        }

        $action = $this->actionRepository->find((int) $request->get_param('actionId'));

        if ($action === null) {
            return new WP_Error(
                'helm.action.not_found',
                __('Action not found.', 'helm'),
                ['status' => 404]
            );
        }

        $ship = ShipPost::fromId($action->ship_post_id);

        if ($ship === null || $ship->ownerId() !== get_current_user_id()) {
            return new WP_Error(
                'rest_forbidden',
                __('You do not own this ship.', 'helm'),
                ['status' => 403]
            );
        }

        return true;
    }

    /**
     * List ship actions (newest first) with cursor-based pagination.
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     * @return WP_REST_Response
     */
    public function index(WP_REST_Request $request): WP_REST_Response
    {
        $shipPostId = (int) $request->get_param('id');
        $perPage    = (int) $request->get_param('per_page');
        $before     = $request->get_param('before');

        $result = $this->actionRepository->findForShipPaginated(
            $shipPostId,
            $perPage,
            $before !== null ? (int) $before : null
        );

        $data = array_map(
            fn(Action $action) => $this->serializeAction($action),
            $result['actions']
        );

        $response = new WP_REST_Response($data);

        if ($result['has_more'] && count($result['actions']) > 0) {
            $lastAction = end($result['actions']);
            $nextUrl    = rest_url(sprintf('helm/v1/ships/%d/actions', $shipPostId));
            $nextUrl    = add_query_arg([
                'per_page' => $perPage,
                'before'   => $lastAction->id,
            ], $nextUrl);
            $response->link_header('next', $nextUrl);
        }

        return $response;
    }

    /**
     * Create a ship action.
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     * @return WP_REST_Response|WP_Error
     */
    public function create(WP_REST_Request $request)
    {
        $shipPostId = (int) $request->get_param('id');
        $type       = ActionType::from($request->get_param('type'));
        $params     = $request->get_param('params') ?? [];

        try {
            $action = $this->actionFactory->create($shipPostId, $type, $params);
        } catch (ActionException $e) {
            $error  = $e->toWpError();
            $error->add_data(['status' => $e->errorCode->httpStatus()]);

            return $error;
        }

        return new WP_REST_Response($this->serializeAction($action), 201);
    }

    /**
     * Get a specific action by ID.
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     * @return WP_REST_Response|WP_Error
     */
    public function show(WP_REST_Request $request)
    {
        $shipPostId = (int) $request->get_param('id');
        $actionId   = (int) $request->get_param('actionId');

        $action = $this->actionRepository->find($actionId);

        if ($action === null || $action->ship_post_id !== $shipPostId) {
            return new WP_Error(
                'helm.action.not_found',
                __('Action not found.', 'helm'),
                ['status' => 404]
            );
        }

        return new WP_REST_Response($this->serializeAction($action));
    }

    /**
     * Get an action by ID (without ship context).
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     * @return WP_REST_Response
     */
    public function showById(WP_REST_Request $request): WP_REST_Response
    {
        $action = $this->actionRepository->find((int) $request->get_param('actionId'));

        return new WP_REST_Response($this->serializeAction($action));
    }

    /**
     * Serialize an Action model for JSON response.
     *
     * @return array<string, mixed>
     */
    private function serializeAction(Action $action): array
    {
        return [
            'id'             => $action->id,
            'ship_post_id'   => $action->ship_post_id,
            'type'           => $action->type->value,
            'status'         => $action->status->value,
            'params'         => $action->params,
            'result'         => $action->result,
            'deferred_until' => $action->deferred_until?->format('c'),
            'created_at'     => $action->created_at->format('c'),
            'updated_at'     => $action->updated_at->format('c'),
        ];
    }
}
