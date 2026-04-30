<?php

declare(strict_types=1);

namespace Helm\Rest;

use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\UserEdge;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * REST controller for navigation edges, scoped to the authenticated user.
 *
 * GET /helm/v1/edges  - List edges the authenticated user has discovered
 * HEAD /helm/v1/edges - Same response headers, no body (WP REST auto)
 *
 * The collection is naturally scoped per-user because edge knowledge is
 * a per-player fog-of-war layer. Admin-wide access (returning every
 * discovered edge for moderation or analytics) is a future capability
 * that can widen the same route under a capability check rather than
 * living on a separate /admin/edges path.
 *
 * Response carries freshness headers the client uses to decide whether
 * to refetch, following the X-WP-Total convention on collection routes.
 */
final class EdgesController
{
    private const NAMESPACE = 'helm/v1';

    public function __construct(
        private readonly UserEdgeRepository $userEdgeRepository,
    ) {
    }

    public function register(): void
    {
        register_rest_route(
            self::NAMESPACE,
            '/edges',
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'index'],
                'permission_callback' => [$this, 'permissions'],
                'args'                => [
                    'include' => [
                        'description' => __('Limit results to specific edge IDs.', 'helm'),
                        'type'        => ['array', 'string'],
                        'items'       => [
                            'type' => 'integer',
                        ],
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
     * @param WP_REST_Request<array<string, mixed>> $request
     */
    public function index(WP_REST_Request $request): WP_REST_Response|WP_Error
    {
        $userId = get_current_user_id();
        $include = $this->resolveInclude($request->get_param('include'));
        $page = (int) $request->get_param('page');
        $perPage = (int) $request->get_param('per_page');

        if ($include !== []) {
            $edges = $this->userEdgeRepository->getMany($userId, $include);
            if (count($edges) !== count($include)) {
                return new WP_Error(
                    'rest_forbidden',
                    __('You are not authorized to access one or more requested edges.', 'helm'),
                    ['status' => 403]
                );
            }
            $total = count($edges);
            $totalPages = 1;
        } else {
            $result = $this->userEdgeRepository->paginate($userId, $page, $perPage);
            $edges = $result['edges'];
            $total = $result['total'];
            $totalPages = (int) ceil($total / $perPage);
        }

        $lastDiscovered = $this->userEdgeRepository->lastDiscovered($userId);

        $data = array_map(fn (UserEdge $ue) => $this->serialize($ue), $edges);

        $response = new WP_REST_Response($data);
        $response->header('X-WP-Total', (string) $total);
        $response->header('X-WP-TotalPages', (string) $totalPages);
        $response->header('X-Helm-Edge-Last-Discovered', $lastDiscovered ?? '');

        return $response;
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(UserEdge $userEdge): array
    {
        return [
            'id'            => $userEdge->edgeId,
            'node_a_id'     => $userEdge->nodeAId,
            'node_b_id'     => $userEdge->nodeBId,
            'distance'      => $userEdge->distance,
            'discovered_at' => $userEdge->discoveredAt,
        ];
    }

    /**
     * Resolve include parameter values to unique positive edge IDs.
     *
     * @param mixed $include
     * @return int[]
     */
    private function resolveInclude(mixed $include): array
    {
        if ($include === null || $include === '') {
            return [];
        }

        if (is_string($include)) {
            $include = explode(',', $include);
        }

        if (! is_array($include)) {
            return [];
        }

        $ids = [];
        foreach ($include as $id) {
            $id = (int) $id;
            if ($id > 0) {
                $ids[$id] = $id;
            }
        }

        return array_values($ids);
    }
}
