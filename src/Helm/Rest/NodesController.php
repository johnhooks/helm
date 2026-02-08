<?php

declare(strict_types=1);

namespace Helm\Rest;

use Helm\Celestials\CelestialService;
use Helm\Celestials\CelestialType;
use Helm\Core\ErrorCode;
use Helm\Navigation\Node;
use Helm\Navigation\NodeRepository;
use Helm\Navigation\NodeType;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * REST controller for navigation nodes.
 *
 * GET /helm/v1/nodes              - List nodes with pagination
 * GET /helm/v1/nodes/{id}         - Single node
 * GET /helm/v1/nodes/{id}/stars   - Stars at a node
 */
final class NodesController
{
    private const NAMESPACE = 'helm/v1';

    public function __construct(
        private readonly NodeRepository $nodeRepository,
        private readonly CelestialService $celestialService,
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

        register_rest_route(
            self::NAMESPACE,
            '/nodes/(?P<id>\d+)',
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'show'],
                'permission_callback' => [$this, 'permissions'],
                'args'                => [
                    'id' => [
                        'description' => __('Node ID.', 'helm'),
                        'type'        => 'integer',
                        'required'    => true,
                    ],
                ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/nodes/(?P<id>\d+)/stars',
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'nodeStars'],
                'permission_callback' => [$this, 'permissions'],
                'args'                => [
                    'id' => [
                        'description' => __('Node ID.', 'helm'),
                        'type'        => 'integer',
                        'required'    => true,
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

        $embedStars = $this->shouldEmbedStars($request);
        $starsByNode = $embedStars
            ? $this->celestialService->serializeStarsForNodes(array_map(fn (Node $n) => $n->id, $result['nodes']))
            : [];

        $data = array_map(
            fn (Node $node) => $this->serializeNode($node, $starsByNode[$node->id] ?? null),
            $result['nodes']
        );

        $response = new WP_REST_Response($data);
        $response->header('X-WP-Total', (string) $total);
        $response->header('X-WP-TotalPages', (string) $totalPages);

        return $response;
    }

    /**
     * Get a single node.
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     * @return WP_REST_Response|WP_Error
     */
    public function show(WP_REST_Request $request)
    {
        $nodeId = (int) $request->get_param('id');

        $node = $this->nodeRepository->get($nodeId);
        if ($node === null) {
            return ErrorCode::NodeNotFound->error(
                __('Node not found.', 'helm'),
                ['status' => ErrorCode::NodeNotFound->httpStatus()]
            );
        }

        $embeddedStars = $this->shouldEmbedStars($request)
            ? $this->celestialService->serializeStarsForNode($nodeId)
            : null;

        return new WP_REST_Response($this->serializeNode($node, $embeddedStars));
    }

    /**
     * Get stars at a node.
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     * @return WP_REST_Response|WP_Error
     */
    public function nodeStars(WP_REST_Request $request)
    {
        $nodeId = (int) $request->get_param('id');

        $node = $this->nodeRepository->get($nodeId);
        if ($node === null) {
            return ErrorCode::NodeNotFound->error(
                __('Node not found.', 'helm'),
                ['status' => ErrorCode::NodeNotFound->httpStatus()]
            );
        }

        return new WP_REST_Response(
            $this->celestialService->serializeStarsForNode($nodeId)
        );
    }

    /**
     * Serialize a node for JSON response.
     *
     * @param list<array<string, mixed>>|null $embeddedStars Serialized star records, or null.
     * @return array<string, mixed>
     */
    private function serializeNode(Node $node, ?array $embeddedStars = null): array
    {
        $embedKey = CelestialType::Star->embedKey();

        $data = [
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
                $embedKey => [
                    [
                        'href'       => rest_url(self::NAMESPACE . '/nodes/' . $node->id . '/stars'),
                        'embeddable' => $embeddedStars === null,
                    ],
                ],
            ],
        ];

        if ($embeddedStars !== null) {
            $data['_embedded'][$embedKey] = $embeddedStars;
        }

        return $data;
    }

    /**
     * Check if the request wants helm:stars embedded.
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     */
    private function shouldEmbedStars(WP_REST_Request $request): bool
    {
        $embed = $request->get_param('_embed');
        if ($embed === null || $embed === '' || $embed === false) {
            return false;
        }

        // _embed=true or _embed (no value) means embed all
        if ($embed === true || $embed === '1' || $embed === 'true') {
            return true;
        }

        // _embed=helm:stars or _embed=helm:stars,wp:term
        if (is_string($embed)) {
            $targets = array_map('trim', explode(',', $embed));
            return in_array(CelestialType::Star->embedKey(), $targets, true);
        }

        return false;
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
