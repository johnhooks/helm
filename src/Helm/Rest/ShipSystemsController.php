<?php

declare(strict_types=1);

namespace Helm\Rest;

use Helm\Core\ErrorCode;
use Helm\Inventory\InventoryRepository;
use Helm\Inventory\LocationType;
use Helm\Products\ProductRepository;
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

    public function __construct(
        private readonly InventoryRepository $inventoryRepository,
        private readonly ProductRepository $productRepository,
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

        // Lightweight query - only inventory + components, no products
        $systems = $this->inventoryRepository->findFittedByLocation(LocationType::Ship, $shipPostId);

        // Prime the product cache so embed resolution hits warm cache instead of N queries.
        // Mirrors WP_REST_Server::embed_links() — non-array means "all", array means selective.
        $embed = $request->get_param('_embed');

        if ($embed !== null && (! is_array($embed) || in_array(LinkRel::Product->value, $embed, true))) {
            $productIds = array_unique(array_column($systems, 'product_id'));
            $this->productRepository->findByIds($productIds);
        }

        // Add per-item links so WP REST embeds products on each component.
        $items = array_map(static function (array $component): array {
            $component['_links'] = [
                LinkRel::Product->value => [
                    [
                        'href'       => rest_url(self::NAMESPACE . '/products/' . $component['product_id']),
                        'embeddable' => true,
                    ],
                ],
            ];

            return $component;
        }, $systems);

        return new WP_REST_Response($items);
    }
}
