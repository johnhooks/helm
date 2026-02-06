<?php

declare(strict_types=1);

namespace Helm\Rest;

use Helm\Core\ErrorCode;
use Helm\ShipLink\FittedComponent;
use Helm\ShipLink\LoadoutFactory;
use Helm\Ships\ShipPost;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * REST controller for ship systems (loadout).
 *
 * GET /helm/v1/ships/{id}/systems - Ship loadout (fitted systems)
 */
final class ShipSystemsController
{
    private const NAMESPACE = 'helm/v1';

    public function __construct(
        private readonly LoadoutFactory $loadoutFactory,
    ) {
    }

    /**
     * Register REST routes.
     */
    public function register(): void
    {
        register_rest_route(
            self::NAMESPACE,
            '/ships/(?P<id>\d+)/systems',
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'index'],
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
                ['status' => 404]
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
     * Get ship systems (loadout).
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     * @return WP_REST_Response|WP_Error
     */
    public function index(WP_REST_Request $request)
    {
        $shipPostId = (int) $request->get_param('id');
        $loadout = $this->loadoutFactory->build($shipPostId);

        $systems = [];

        foreach (['core', 'drive', 'sensor', 'shield', 'nav'] as $slotName) {
            $fitted = $loadout->slot($slotName);
            if ($fitted !== null) {
                $systems[] = $this->serializeFittedComponent($fitted);
            }
        }

        // Equipment slots
        foreach ($loadout->equipment() as $fitted) {
            $systems[] = $this->serializeFittedComponent($fitted);
        }

        return new WP_REST_Response($systems);
    }

    /**
     * Serialize a fitted component for JSON response.
     *
     * @return array<string, mixed>
     */
    private function serializeFittedComponent(FittedComponent $fitted): array
    {
        return [
            'id'          => $fitted->id(),
            'product_id'  => $fitted->component()->product_id,
            'slot'        => $fitted->slot()->value,
            'life'        => $fitted->life(),
            'usage_count' => $fitted->usageCount(),
            'condition'   => $fitted->condition(),
        ];
    }
}
