<?php

declare(strict_types=1);

namespace Tests\Wpunit\Rest;

use Helm\Navigation\NodeRepository;
use Helm\Navigation\NodeType;
use lucatume\WPBrowser\TestCase\WPRestApiTestCase;
use Tests\Support\WpunitTester;
use WP_REST_Request;

/**
 * @covers \Helm\Rest\NodesController
 *
 * @property WpunitTester $tester
 */
class NodesControllerTest extends WPRestApiTestCase
{
    private NodeRepository $nodeRepository;
    private int $userId;

    public function set_up(): void
    {
        parent::set_up();

        $this->nodeRepository = helm(NodeRepository::class);
        $this->userId = self::factory()->user->create(['role' => 'subscriber']);
        wp_set_current_user($this->userId);
    }

    public function test_returns_nodes_with_correct_structure(): void
    {
        $node = $this->nodeRepository->create(1.0, 2.0, 3.0, NodeType::System);

        $request = new WP_REST_Request('GET', '/helm/v1/nodes');
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());

        $data = $response->get_data();
        $this->assertNotEmpty($data);

        $first = $data[0];
        $this->assertArrayHasKey('id', $first);
        $this->assertArrayHasKey('type', $first);
        $this->assertArrayHasKey('x', $first);
        $this->assertArrayHasKey('y', $first);
        $this->assertArrayHasKey('z', $first);
        $this->assertArrayHasKey('created_at', $first);
        $this->assertArrayHasKey('_links', $first);
    }

    public function test_filters_by_system_type(): void
    {
        $this->nodeRepository->create(1.0, 0.0, 0.0, NodeType::System);
        $this->nodeRepository->create(2.0, 0.0, 0.0, NodeType::Waypoint, hash: 'wp_test_1');

        $request = new WP_REST_Request('GET', '/helm/v1/nodes');
        $request->set_param('type', 'system');
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());

        $data = $response->get_data();
        foreach ($data as $item) {
            $this->assertSame('system', $item['type']);
        }
    }

    public function test_filters_by_waypoint_type(): void
    {
        $this->nodeRepository->create(1.0, 0.0, 0.0, NodeType::System);
        $this->nodeRepository->create(2.0, 0.0, 0.0, NodeType::Waypoint, hash: 'wp_test_2');

        $request = new WP_REST_Request('GET', '/helm/v1/nodes');
        $request->set_param('type', 'waypoint');
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());

        $data = $response->get_data();
        $this->assertNotEmpty($data);
        foreach ($data as $item) {
            $this->assertSame('waypoint', $item['type']);
        }
    }

    public function test_pagination_headers(): void
    {
        // Create 3 nodes
        $this->nodeRepository->create(1.0, 0.0, 0.0, NodeType::System);
        $this->nodeRepository->create(2.0, 0.0, 0.0, NodeType::System);
        $this->nodeRepository->create(3.0, 0.0, 0.0, NodeType::System);

        $request = new WP_REST_Request('GET', '/helm/v1/nodes');
        $request->set_param('per_page', 2);
        $request->set_param('type', 'system');
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());
        $this->assertCount(2, $response->get_data());
        $this->assertSame('3', $response->get_headers()['X-WP-Total']);
        $this->assertSame('2', $response->get_headers()['X-WP-TotalPages']);
    }

    public function test_pagination_second_page(): void
    {
        $this->nodeRepository->create(1.0, 0.0, 0.0, NodeType::System);
        $this->nodeRepository->create(2.0, 0.0, 0.0, NodeType::System);
        $this->nodeRepository->create(3.0, 0.0, 0.0, NodeType::System);

        $request = new WP_REST_Request('GET', '/helm/v1/nodes');
        $request->set_param('per_page', 2);
        $request->set_param('page', 2);
        $request->set_param('type', 'system');
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());
        $this->assertCount(1, $response->get_data());
    }

    public function test_returns_401_when_not_logged_in(): void
    {
        wp_set_current_user(0);

        $request = new WP_REST_Request('GET', '/helm/v1/nodes');
        $response = rest_do_request($request);

        $this->assertErrorResponse('rest_not_logged_in', $response, 401);
    }

    public function test_includes_stars_link(): void
    {
        $node = $this->nodeRepository->create(1.0, 2.0, 3.0, NodeType::System);

        $request = new WP_REST_Request('GET', '/helm/v1/nodes');
        $response = rest_do_request($request);

        $data = $response->get_data();
        $first = $data[0];

        $this->assertArrayHasKey('helm:stars', $first['_links']);
        $starsLink = $first['_links']['helm:stars'][0];
        $this->assertTrue($starsLink['embeddable']);
        $this->assertStringContainsString('/nodes/' . $node->id . '/stars', $starsLink['href']);
    }

    public function test_empty_result_returns_empty_array(): void
    {
        $request = new WP_REST_Request('GET', '/helm/v1/nodes');
        $request->set_param('type', 'system');
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());
        $this->assertSame([], $response->get_data());
        $this->assertSame('0', $response->get_headers()['X-WP-Total']);
        $this->assertSame('0', $response->get_headers()['X-WP-TotalPages']);
    }

    public function test_node_type_serialized_as_string(): void
    {
        $this->nodeRepository->create(1.0, 0.0, 0.0, NodeType::System);
        $this->nodeRepository->create(2.0, 0.0, 0.0, NodeType::Waypoint, hash: 'wp_test_3');

        $request = new WP_REST_Request('GET', '/helm/v1/nodes');
        $response = rest_do_request($request);

        $data = $response->get_data();
        $types = array_column($data, 'type');

        $this->assertContains('system', $types);
        $this->assertContains('waypoint', $types);
    }
}
