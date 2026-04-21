<?php

declare(strict_types=1);

namespace Tests\Wpunit\Rest;

use Helm\Lib\Date;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\NodeType;
use lucatume\WPBrowser\TestCase\WPRestApiTestCase;
use WP_REST_Request;

/**
 * @covers \Helm\Rest\EdgesController
 */
class EdgesControllerTest extends WPRestApiTestCase
{
    private UserEdgeRepository $userEdgeRepository;
    private EdgeRepository $edgeRepository;
    private NodeRepository $nodeRepository;
    private int $userId;

    public function set_up(): void
    {
        parent::set_up();

        $this->userEdgeRepository = helm(UserEdgeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);
        $this->nodeRepository = helm(NodeRepository::class);

        $this->userId = self::factory()->user->create(['role' => 'subscriber']);
        wp_set_current_user($this->userId);
    }

    public function tear_down(): void
    {
        Date::setTestNow(null);
        parent::tear_down();
    }

    private function createEdge(): int
    {
        $nodeA = $this->nodeRepository->create(0.0, 0.0, 0.0, NodeType::System);
        $nodeB = $this->nodeRepository->create(1.0, 0.0, 0.0, NodeType::System);
        return $this->edgeRepository->create($nodeA->id, $nodeB->id, 1.0)->id;
    }

    public function test_returns_401_when_not_logged_in(): void
    {
        wp_set_current_user(0);

        $request = new WP_REST_Request('GET', '/helm/v1/edges');
        $response = rest_do_request($request);

        $this->assertErrorResponse('rest_not_logged_in', $response, 401);
    }

    public function test_empty_list_still_carries_freshness_headers(): void
    {
        $request = new WP_REST_Request('GET', '/helm/v1/edges');
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());
        $this->assertSame([], $response->get_data());
        $this->assertSame('0', $response->get_headers()['X-WP-Total']);
        $this->assertSame('0', $response->get_headers()['X-WP-TotalPages']);
        $this->assertSame('', $response->get_headers()['X-Helm-Edge-Last-Discovered']);
    }

    public function test_populated_list_returns_edges_and_headers(): void
    {
        $edgeA = $this->createEdge();
        $edgeB = $this->createEdge();

        Date::setTestNow(new \DateTimeImmutable('2026-04-01 00:00:00', new \DateTimeZone('UTC')));
        $this->userEdgeRepository->upsert($this->userId, $edgeA);

        Date::setTestNow(new \DateTimeImmutable('2026-04-19 12:34:56', new \DateTimeZone('UTC')));
        $this->userEdgeRepository->upsert($this->userId, $edgeB);

        $request = new WP_REST_Request('GET', '/helm/v1/edges');
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());

        $data = $response->get_data();
        $this->assertCount(2, $data);

        $first = $data[0];
        $this->assertArrayHasKey('id', $first);
        $this->assertArrayHasKey('node_a_id', $first);
        $this->assertArrayHasKey('node_b_id', $first);
        $this->assertArrayHasKey('distance', $first);
        $this->assertArrayHasKey('discovered_at', $first);

        $this->assertSame('2', $response->get_headers()['X-WP-Total']);
        $this->assertSame('1', $response->get_headers()['X-WP-TotalPages']);
        $this->assertSame(
            '2026-04-19T12:34:56+00:00',
            $response->get_headers()['X-Helm-Edge-Last-Discovered'],
        );
    }

    public function test_user_a_does_not_see_user_b_discoveries(): void
    {
        $edge = $this->createEdge();

        $otherUser = self::factory()->user->create(['role' => 'subscriber']);
        $this->userEdgeRepository->upsert($otherUser, $edge);

        $request = new WP_REST_Request('GET', '/helm/v1/edges');
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());
        $this->assertSame([], $response->get_data());
        $this->assertSame('0', $response->get_headers()['X-WP-Total']);
    }

    public function test_paginates_with_per_page_argument(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->userEdgeRepository->upsert($this->userId, $this->createEdge());
        }

        $request = new WP_REST_Request('GET', '/helm/v1/edges');
        $request->set_param('per_page', 2);
        $request->set_param('page', 2);
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());
        $this->assertCount(2, $response->get_data());
        $this->assertSame('5', $response->get_headers()['X-WP-Total']);
        $this->assertSame('3', $response->get_headers()['X-WP-TotalPages']);
    }

    public function test_head_returns_same_headers_as_get(): void
    {
        $edge = $this->createEdge();

        Date::setTestNow(new \DateTimeImmutable('2026-04-19 12:34:56', new \DateTimeZone('UTC')));
        $this->userEdgeRepository->upsert($this->userId, $edge);

        $headRequest = new WP_REST_Request('HEAD', '/helm/v1/edges');
        $headResponse = rest_do_request($headRequest);

        $this->assertSame(200, $headResponse->get_status());
        $this->assertSame('1', $headResponse->get_headers()['X-WP-Total']);
        $this->assertSame(
            '2026-04-19T12:34:56+00:00',
            $headResponse->get_headers()['X-Helm-Edge-Last-Discovered'],
        );
    }
}
