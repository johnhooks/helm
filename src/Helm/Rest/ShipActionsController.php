<?php

declare(strict_types=1);

namespace Helm\Rest;

use Helm\Core\ErrorCode;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\ActionFactory;
use Helm\ShipLink\ActionRepository;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\Ships\ShipPost;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * REST controller for ship actions.
 *
 * POST   /helm/v1/ships/{id}/actions
 * GET    /helm/v1/ships/{id}/actions/current
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
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            self::ROUTE . '/current',
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'current'],
                'permission_callback' => [$this, 'permissions'],
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
     * Get the current (pending/running) action for a ship.
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     * @return WP_REST_Response|WP_Error
     */
    public function current(WP_REST_Request $request)
    {
        $shipPostId = (int) $request->get_param('id');

        $action = $this->actionRepository->findCurrentForShip($shipPostId);

        if ($action === null) {
            return new WP_Error(
                'helm.action.none',
                __('No active action.', 'helm'),
                ['status' => 404]
            );
        }

        return new WP_REST_Response($this->serializeAction($action));
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
