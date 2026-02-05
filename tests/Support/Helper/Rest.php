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
}
