<?php

declare(strict_types=1);

namespace Tests\Wpunit\Rest;

use Helm\Navigation\Node;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Navigation\NodeType;
use Helm\Stars\StarPost;
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

    /**
     * Create a star linked to a node via the navigation provider hook.
     *
     * @param array<string, mixed> $attributes
     * @return array{star: StarPost, node: Node}
     */
    private function createStarAtNode(array $attributes = []): array
    {
        $star = $this->tester->haveStar($attributes);
        $node = $this->tester->getNodeForStar($star);

        $this->assertNotNull($node, 'Star should have a linked node');

        return ['star' => $star, 'node' => $node];
    }

    // -------------------------------------------------------
    // GET /nodes
    // -------------------------------------------------------

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

    // -------------------------------------------------------
    // GET /nodes/{id}
    // -------------------------------------------------------

    public function test_show_returns_single_node(): void
    {
        $node = $this->nodeRepository->create(1.0, 2.0, 3.0, NodeType::System);

        $request = new WP_REST_Request('GET', "/helm/v1/nodes/{$node->id}");
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());

        $data = $response->get_data();
        $this->assertSame($node->id, $data['id']);
        $this->assertSame('system', $data['type']);
        $this->assertSame(1.0, $data['x']);
        $this->assertSame(2.0, $data['y']);
        $this->assertSame(3.0, $data['z']);
        $this->assertArrayHasKey('created_at', $data);
    }

    public function test_show_node_not_found(): void
    {
        $request = new WP_REST_Request('GET', '/helm/v1/nodes/999999');
        $response = rest_do_request($request);

        $this->assertErrorResponse('helm.node.not_found', $response, 404);
    }

    public function test_show_returns_401_when_not_logged_in(): void
    {
        wp_set_current_user(0);

        $request = new WP_REST_Request('GET', '/helm/v1/nodes/1');
        $response = rest_do_request($request);

        $this->assertErrorResponse('rest_not_logged_in', $response, 401);
    }

    public function test_show_includes_stars_link(): void
    {
        $node = $this->nodeRepository->create(1.0, 2.0, 3.0, NodeType::System);

        $request = new WP_REST_Request('GET', "/helm/v1/nodes/{$node->id}");
        $response = rest_do_request($request);

        $data = $response->get_data();

        $this->assertArrayHasKey('helm:stars', $data['_links']);
        $starsLink = $data['_links']['helm:stars'][0];
        $this->assertStringContainsString('/nodes/' . $node->id . '/stars', $starsLink['href']);
    }

    public function test_show_embeds_stars(): void
    {
        ['star' => $star, 'node' => $node] = $this->createStarAtNode([
            'id' => 'SHOW_EMBED',
            'name' => 'Show Embed Star',
            'spectralType' => 'G2V',
            'distanceLy' => 10.0,
        ]);

        $request = new WP_REST_Request('GET', "/helm/v1/nodes/{$node->id}");
        $request->set_param('_embed', 'helm:stars');
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());

        $data = $response->get_data();
        $this->assertArrayHasKey('_embedded', $data);
        $this->assertArrayHasKey('helm:stars', $data['_embedded']);
        $this->assertNotEmpty($data['_embedded']['helm:stars']);

        $embeddedStar = $data['_embedded']['helm:stars'][0];
        $this->assertSame($star->postId(), $embeddedStar['id']);
        $this->assertSame('SHOW_EMBED', $embeddedStar['catalog_id']);
    }

    // -------------------------------------------------------
    // GET /nodes/{id}/stars
    // -------------------------------------------------------

    public function test_node_stars_returns_star_summaries(): void
    {
        ['star' => $star, 'node' => $node] = $this->createStarAtNode([
            'id' => 'STARS_REST',
            'name' => 'REST Star',
            'spectralType' => 'A0V',
            'distanceLy' => 25.0,
        ]);

        $request = new WP_REST_Request('GET', "/helm/v1/nodes/{$node->id}/stars");
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());

        $data = $response->get_data();
        $this->assertCount(1, $data);

        $starData = $data[0];
        $this->assertSame($star->postId(), $starData['id']);
        $this->assertSame('helm_star', $starData['post_type']);
        $this->assertSame('REST Star', $starData['title']);
        $this->assertSame('STARS_REST', $starData['catalog_id']);
        $this->assertSame('A', $starData['spectral_class']);
        $this->assertArrayHasKey('x', $starData);
        $this->assertArrayHasKey('y', $starData);
        $this->assertArrayHasKey('z', $starData);
        $this->assertArrayHasKey('mass', $starData);
        $this->assertArrayHasKey('radius', $starData);
        $this->assertArrayHasKey('node_id', $starData);
        $this->assertSame($node->id, $starData['node_id']);
    }

    public function test_node_stars_returns_empty_for_no_stars(): void
    {
        $node = $this->nodeRepository->create(5.0, 5.0, 5.0, NodeType::Waypoint, hash: 'no_stars');

        $request = new WP_REST_Request('GET', "/helm/v1/nodes/{$node->id}/stars");
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());
        $this->assertSame([], $response->get_data());
    }

    public function test_node_stars_node_not_found(): void
    {
        $request = new WP_REST_Request('GET', '/helm/v1/nodes/999999/stars');
        $response = rest_do_request($request);

        $this->assertErrorResponse('helm.node.not_found', $response, 404);
    }

    public function test_node_stars_returns_401_when_not_logged_in(): void
    {
        wp_set_current_user(0);

        $request = new WP_REST_Request('GET', '/helm/v1/nodes/1/stars');
        $response = rest_do_request($request);

        $this->assertErrorResponse('rest_not_logged_in', $response, 401);
    }

    public function test_node_stars_multiple_stars_at_node(): void
    {
        $star1 = $this->tester->haveStar([
            'id' => 'BINARY_A',
            'name' => 'Alpha A',
            'distanceLy' => 4.37,
            'ra' => 219.9,
            'dec' => -60.8,
            'properties' => [
                'system_id' => 'BINARY_SYSTEM',
                'is_primary' => true,
                'component_count' => 2,
            ],
        ]);

        $node = $this->tester->getNodeForStar($star1);
        $this->assertNotNull($node);

        $this->tester->haveStar([
            'id' => 'BINARY_B',
            'name' => 'Alpha B',
            'distanceLy' => 4.37,
            'ra' => 219.9,
            'dec' => -60.8,
            'properties' => [
                'system_id' => 'BINARY_SYSTEM',
                'is_primary' => false,
                'component_count' => 2,
            ],
        ]);

        $request = new WP_REST_Request('GET', "/helm/v1/nodes/{$node->id}/stars");
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());

        $data = $response->get_data();
        $this->assertGreaterThanOrEqual(2, count($data));

        $catalogIds = array_map(
            fn ($star) => $star['catalog_id'],
            $data
        );
        $this->assertContains('BINARY_A', $catalogIds);
        $this->assertContains('BINARY_B', $catalogIds);
    }

    public function test_star_serialization_includes_is_primary(): void
    {
        $star1 = $this->tester->haveStar([
            'id' => 'PRIMARY_A',
            'name' => 'Primary Star',
            'distanceLy' => 5.0,
            'ra' => 100.0,
            'dec' => -30.0,
            'properties' => [
                'system_id' => 'IS_PRIMARY_TEST',
                'is_primary' => true,
                'component_count' => 2,
            ],
        ]);

        $node = $this->tester->getNodeForStar($star1);
        $this->assertNotNull($node);

        $this->tester->haveStar([
            'id' => 'SECONDARY_B',
            'name' => 'Secondary Star',
            'distanceLy' => 5.0,
            'ra' => 100.0,
            'dec' => -30.0,
            'properties' => [
                'system_id' => 'IS_PRIMARY_TEST',
                'is_primary' => false,
                'component_count' => 2,
            ],
        ]);

        $request = new WP_REST_Request('GET', "/helm/v1/nodes/{$node->id}/stars");
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());

        $data = $response->get_data();
        $this->assertGreaterThanOrEqual(2, count($data));

        $starsByCatalog = [];
        foreach ($data as $star) {
            $this->assertArrayHasKey('is_primary', $star);
            $starsByCatalog[$star['catalog_id']] = $star;
        }

        $this->assertTrue($starsByCatalog['PRIMARY_A']['is_primary']);
        $this->assertFalse($starsByCatalog['SECONDARY_B']['is_primary']);
    }

    public function test_embedded_stars_include_is_primary(): void
    {
        ['star' => $star, 'node' => $node] = $this->createStarAtNode([
            'id' => 'EMBED_PRIMARY',
            'name' => 'Embed Primary Star',
            'spectralType' => 'K1V',
            'distanceLy' => 12.0,
        ]);

        $request = new WP_REST_Request('GET', "/helm/v1/nodes/{$node->id}");
        $request->set_param('_embed', 'helm:stars');
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());

        $embedded = $response->get_data()['_embedded']['helm:stars'];
        $this->assertNotEmpty($embedded);
        $this->assertArrayHasKey('is_primary', $embedded[0]);
        $this->assertTrue($embedded[0]['is_primary']);
    }
}
