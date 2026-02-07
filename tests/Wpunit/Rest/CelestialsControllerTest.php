<?php

declare(strict_types=1);

namespace Tests\Wpunit\Rest;

use Helm\Navigation\Node;
use Helm\Navigation\NodeRepository;
use Helm\Navigation\NodeType;
use Helm\PostTypes\PostTypeRegistry;
use Helm\Stars\StarPost;
use lucatume\WPBrowser\TestCase\WPRestApiTestCase;
use Tests\Support\WpunitTester;
use WP_REST_Request;

/**
 * @covers \Helm\Rest\CelestialsController
 *
 * @property WpunitTester $tester
 */
class CelestialsControllerTest extends WPRestApiTestCase
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
    // GET /nodes/{id}/celestials
    // -------------------------------------------------------

    public function test_celestials_returns_flat_array_of_wp_rest_posts(): void
    {
        ['star' => $star, 'node' => $node] = $this->createStarAtNode([
            'id' => 'CELESTIALS_FLAT',
            'name' => 'Test Star',
            'spectralType' => 'G2V',
            'distanceLy' => 10.0,
        ]);

        $request = new WP_REST_Request('GET', "/helm/v1/nodes/{$node->id}/celestials");
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());

        $data = $response->get_data();
        $this->assertIsArray($data);
        $this->assertCount(1, $data);

        // WP REST post format
        $post = $data[0];
        $this->assertSame($star->postId(), $post['id']);
        $this->assertSame(PostTypeRegistry::POST_TYPE_STAR, $post['type']);
        $this->assertArrayHasKey('title', $post);
        $this->assertArrayHasKey('meta', $post);
    }

    public function test_celestials_star_includes_registered_meta(): void
    {
        ['node' => $node] = $this->createStarAtNode([
            'id' => 'CELESTIALS_META',
            'name' => 'Meta Star',
            'spectralType' => 'K5V',
            'distanceLy' => 12.0,
            'properties' => [
                'luminosity_solar' => 0.5,
                'temperature_k' => 4500,
            ],
        ]);

        $request = new WP_REST_Request('GET', "/helm/v1/nodes/{$node->id}/celestials");
        $response = rest_do_request($request);

        $data = $response->get_data();
        $meta = $data[0]['meta'];
        $this->assertSame('K5V', $meta['_helm_spectral_type']);
        $this->assertSame(12.0, $meta['_helm_distance_ly']);
        $this->assertIsArray($meta['_helm_star_properties']);
        $this->assertSame(0.5, $meta['_helm_star_properties']['luminosity_solar']);
        $this->assertSame(4500, $meta['_helm_star_properties']['temperature_k']);
    }

    public function test_celestials_node_not_found(): void
    {
        $request = new WP_REST_Request('GET', '/helm/v1/nodes/999999/celestials');
        $response = rest_do_request($request);

        $this->assertErrorResponse('helm.node.not_found', $response, 404);
    }

    public function test_celestials_returns_401_when_not_logged_in(): void
    {
        wp_set_current_user(0);

        $request = new WP_REST_Request('GET', '/helm/v1/nodes/1/celestials');
        $response = rest_do_request($request);

        $this->assertErrorResponse('rest_not_logged_in', $response, 401);
    }

    public function test_celestials_empty_node_returns_empty_array(): void
    {
        $node = $this->nodeRepository->create(1.0, 2.0, 3.0, NodeType::Waypoint, hash: 'empty_node');

        $request = new WP_REST_Request('GET', "/helm/v1/nodes/{$node->id}/celestials");
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());
        $this->assertSame([], $response->get_data());
    }

    // -------------------------------------------------------
    // GET /nodes/{id}/stars
    // -------------------------------------------------------

    public function test_node_stars_returns_wp_rest_post_with_meta(): void
    {
        ['star' => $star, 'node' => $node] = $this->createStarAtNode([
            'id' => 'STARS_REST',
            'name' => 'REST Star',
            'spectralType' => 'A0V',
            'distanceLy' => 25.0,
            'properties' => [
                'luminosity_solar' => 30.0,
                'temperature_k' => 9800,
            ],
        ]);

        $request = new WP_REST_Request('GET', "/helm/v1/nodes/{$node->id}/stars");
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());

        $data = $response->get_data();
        $this->assertCount(1, $data);

        $post = $data[0];
        $this->assertSame($star->postId(), $post['id']);
        $this->assertSame(PostTypeRegistry::POST_TYPE_STAR, $post['type']);
        $this->assertSame('REST Star', $post['title']['rendered']);

        $meta = $post['meta'];
        $this->assertSame('STARS_REST', $meta['_helm_star_id']);
        $this->assertSame('A0V', $meta['_helm_spectral_type']);
        $this->assertSame(25.0, $meta['_helm_distance_ly']);
        $this->assertSame(30.0, $meta['_helm_star_properties']['luminosity_solar']);
        $this->assertSame(9800, $meta['_helm_star_properties']['temperature_k']);
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
            fn ($post) => $post['meta']['_helm_star_id'],
            $data
        );
        $this->assertContains('BINARY_A', $catalogIds);
        $this->assertContains('BINARY_B', $catalogIds);
    }
}
