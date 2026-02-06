<?php

declare(strict_types=1);

namespace Helm\Rest;

use Helm\Core\ErrorCode;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\ActionFactory;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\Ships\ShipPost;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * REST controller for ship actions.
 *
 * POST /helm/v1/ships/{id}/actions
 */
final class ShipActionsController
{
    private const NAMESPACE = 'helm/v1';
    private const ROUTE     = '/ships/(?P<id>\d+)/actions';

    public function __construct(
        private readonly ActionFactory $actionFactory,
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
