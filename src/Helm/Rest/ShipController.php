<?php

declare(strict_types=1);

namespace Helm\Rest;

use Helm\Core\ErrorCode;
use Helm\ShipLink\Ship;
use Helm\ShipLink\ShipFactory;
use Helm\Ships\ShipPost;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * REST controller for ship state.
 *
 * GET /helm/v1/ships/{id} - Ship operational state
 * GET /helm/v1/ships/{id}/cargo - Ship cargo hold
 *
 * For ship metadata (name, owner, etc.), use /wp/v2/ships/{id}.
 */
final class ShipController
{
    private const NAMESPACE = 'helm/v1';

    public function __construct(
        private readonly ShipFactory $shipFactory,
    ) {
    }

    /**
     * Register REST routes.
     */
    public function register(): void
    {
        register_rest_route(
            self::NAMESPACE,
            '/ships/(?P<id>\d+)',
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'show'],
                'permission_callback' => [$this, 'permissions'],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/ships/(?P<id>\d+)/cargo',
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'cargo'],
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
     * Get ship state.
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     * @return WP_REST_Response|WP_Error
     */
    public function show(WP_REST_Request $request)
    {
        $shipPostId = (int) $request->get_param('id');
        $ship = $this->shipFactory->build($shipPostId);

        $response = new WP_REST_Response($this->serializeShip($ship));

        $response->add_link('self', rest_url(self::NAMESPACE . '/ships/' . $shipPostId));
        $response->add_link('helm:systems', rest_url(self::NAMESPACE . '/ships/' . $shipPostId . '/systems'), ['embeddable' => true]);

        return $response;
    }

    /**
     * Get ship cargo.
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     */
    public function cargo(WP_REST_Request $request): WP_REST_Response
    {
        $shipPostId = (int) $request->get_param('id');
        $ship = $this->shipFactory->build($shipPostId);

        return new WP_REST_Response($ship->cargo()->all());
    }

    /**
     * Serialize ship state for JSON response.
     *
     * @return array<string, mixed>
     */
    private function serializeShip(Ship $ship): array
    {
        $state = $ship->getState();

        return [
            'id'                => $ship->getId(),
            'node_id'           => $state->node_id,
            'power_full_at'     => $state->power_full_at?->format('c'),
            'shields_full_at'   => $state->shields_full_at?->format('c'),
            'hull_integrity'    => $state->hull_integrity,
            'cargo'             => $ship->cargo()->all(),
            'current_action_id' => $state->current_action_id,
        ];
    }
}
