<?php

declare(strict_types=1);

namespace Helm\Rest;

use Helm\Celestials\CelestialService;
use Helm\Core\ErrorCode;
use Helm\Navigation\NodeRepository;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * REST controller for celestials at nodes.
 *
 * GET /helm/v1/nodes/{id}/celestials - Get all celestial objects at a node
 * GET /helm/v1/nodes/{id}/stars      - Get stars at a node
 */
final class CelestialsController
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
            '/nodes/(?P<id>\d+)/celestials',
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'index'],
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
     * Get celestials at a node.
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     * @return WP_REST_Response|WP_Error
     */
    public function index(WP_REST_Request $request)
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
            $this->celestialService->getNodeContents($nodeId)
        );
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
            $this->celestialService->getNodeStars($nodeId)
        );
    }
}
