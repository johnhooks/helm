<?php

declare(strict_types=1);

namespace Tests\Support\Helper;

use Codeception\Module;
use WP_REST_Request;
use WP_REST_Response;

/**
 * REST API test utilities.
 *
 * Provides convenience methods for dispatching REST requests in Wpunit tests.
 */
class Rest extends Module
{
    /**
     * Dispatch a POST request to create a ship action.
     *
     * @param int                  $shipPostId Ship post ID.
     * @param array<string, mixed> $body       Request body (type, params).
     * @return WP_REST_Response
     */
    public function postAction(int $shipPostId, array $body): WP_REST_Response
    {
        $request = new WP_REST_Request('POST', "/helm/v1/ships/{$shipPostId}/actions");
        $request->set_header('Content-Type', 'application/json');
        $request->set_body(wp_json_encode($body));

        return rest_do_request($request);
    }

    /**
     * Dispatch a GET request to fetch an action by ID.
     *
     * @param int $actionId Action ID.
     * @return WP_REST_Response
     */
    public function getAction(int $actionId): WP_REST_Response
    {
        $request = new WP_REST_Request('GET', "/helm/v1/actions/{$actionId}");

        return rest_do_request($request);
    }

    /**
     * Dispatch a GET request to list ship actions.
     *
     * @param int                  $shipPostId Ship post ID.
     * @param array<string, mixed> $params     Query params (per_page, before).
     * @return WP_REST_Response
     */
    public function getActions(int $shipPostId, array $params = []): WP_REST_Response
    {
        $request = new WP_REST_Request('GET', "/helm/v1/ships/{$shipPostId}/actions");

        foreach ($params as $key => $value) {
            $request->set_param($key, $value);
        }

        return rest_do_request($request);
    }
}
