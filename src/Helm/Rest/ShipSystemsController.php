<?php

declare(strict_types=1);

namespace Helm\Rest;

use Helm\Core\ErrorCode;
use Helm\ShipLink\ShipFittingRepository;
use Helm\Ships\ShipPost;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * REST controller for ship systems (loadout).
 *
 * GET /helm/v1/ships/{id}/systems - Ship fitted components
 *
 * Supports ?_embed to inline linked products via the products endpoint.
 */
final class ShipSystemsController
{
    private const NAMESPACE = 'helm/v1';
    private const LINK_REL_PRODUCT = 'helm:product';

    public function __construct(
        private readonly ShipFittingRepository $fittingRepository,
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
     * Get ship systems (fitted components).
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     * @return WP_REST_Response|WP_Error
     */
    public function index(WP_REST_Request $request)
    {
        $shipPostId = (int) $request->get_param('id');

        // Lightweight query - only fittings + components, no products
        $systems = $this->fittingRepository->findFittedByShip($shipPostId);

        $response = new WP_REST_Response($systems);

        // Add embeddable links for each unique product
        $productIds = array_unique(array_column($systems, 'product_id'));
        foreach ($productIds as $productId) {
            $response->add_link(
                self::LINK_REL_PRODUCT,
                rest_url(self::NAMESPACE . '/products/' . $productId),
                ['embeddable' => true]
            );
        }

        // Add self and ship links
        $response->add_link('self', rest_url(self::NAMESPACE . '/ships/' . $shipPostId . '/systems'));
        $response->add_link('ship', rest_url(self::NAMESPACE . '/ships/' . $shipPostId), ['embeddable' => true]);

        return $response;
    }
}
