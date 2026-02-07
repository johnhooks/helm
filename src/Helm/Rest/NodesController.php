<?php

declare(strict_types=1);

namespace Helm\Rest;

use Helm\Navigation\Node;
use Helm\Navigation\NodeRepository;
use Helm\Navigation\NodeType;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * REST controller for navigation nodes.
 *
 * GET /helm/v1/nodes - List nodes with pagination
 */
final class NodesController
{
    private const NAMESPACE = 'helm/v1';

    public function __construct(
        private readonly NodeRepository $nodeRepository,
    ) {
    }

    /**
     * Register REST routes.
     */
    public function register(): void
    {
        register_rest_route(
            self::NAMESPACE,
            '/nodes',
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'index'],
                'permission_callback' => [$this, 'permissions'],
                'args'                => [
                    'type' => [
                        'description' => __('Filter by node type.', 'helm'),
                        'type'        => 'string',
                        'enum'        => ['system', 'waypoint'],
                    ],
                    'page' => [
                        'description' => __('Current page of the collection.', 'helm'),
                        'type'        => 'integer',
                        'default'     => 1,
                        'minimum'     => 1,
                    ],
                    'per_page' => [
                        'description' => __('Maximum number of items per page.', 'helm'),
                        'type'        => 'integer',
                        'default'     => 100,
                        'minimum'     => 1,
                        'maximum'     => 500,
                    ],
                ],
            ]
        );
    }

    /**
     * Permission callback.
     *
     * @return true|WP_Error
     */
    public function permissions()
    {
        if (! is_user_logged_in()) {
            return new WP_Error(
                'rest_not_logged_in',
                __('You must be logged in.', 'helm'),
                ['status' => 401]
            );
        }

        return true;
    }

    /**
     * List nodes.
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     * @return WP_REST_Response
     */
    public function index(WP_REST_Request $request): WP_REST_Response
    {
        $typeParam = $request->get_param('type');
        $page = (int) $request->get_param('page');
        $perPage = (int) $request->get_param('per_page');

        $type = $this->resolveType($typeParam);

        $result = $this->nodeRepository->paginate($type, $page, $perPage);
        $total = $result['total'];
        $totalPages = (int) ceil($total / $perPage);

        $data = array_map(
            fn (Node $node) => $this->serializeNode($node),
            $result['nodes']
        );

        $response = new WP_REST_Response($data);
        $response->header('X-WP-Total', (string) $total);
        $response->header('X-WP-TotalPages', (string) $totalPages);

        return $response;
    }

    /**
     * Serialize a node for JSON response.
     *
     * @return array<string, mixed>
     */
    private function serializeNode(Node $node): array
    {
        return [
            'id'         => $node->id,
            'type'       => $this->typeToString($node->type),
            'x'          => $node->x,
            'y'          => $node->y,
            'z'          => $node->z,
            'created_at' => $node->createdAt,
            '_links'     => [
                'self' => [
                    ['href' => rest_url(self::NAMESPACE . '/nodes/' . $node->id)],
                ],
                'helm:stars' => [
                    [
                        'href'       => rest_url(self::NAMESPACE . '/nodes/' . $node->id . '/stars'),
                        'embeddable' => true,
                    ],
                ],
            ],
        ];
    }

    /**
     * Resolve a type string to NodeType enum.
     */
    private function resolveType(?string $type): ?NodeType
    {
        return match ($type) {
            'system'   => NodeType::System,
            'waypoint' => NodeType::Waypoint,
            default    => null,
        };
    }

    /**
     * Convert NodeType to string for serialization.
     */
    private function typeToString(NodeType $type): string
    {
        return match ($type) {
            NodeType::System   => 'system',
            NodeType::Waypoint => 'waypoint',
        };
    }
}
