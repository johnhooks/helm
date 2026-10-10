<?php

declare(strict_types=1);

namespace Tests\Wpunit\Navigation;

use DateTimeImmutable;
use Helm\Lib\Date;
use Helm\Simulation\MemoryUserEdgeRepository;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\NodeType;
use InvalidArgumentException;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\Navigation\WpdbUserEdgeRepository
 * @covers \Helm\Navigation\UserEdge
 */
class UserEdgeRepositoryTest extends WPTestCase
{
    private UserEdgeRepository $userEdgeRepository;
    private EdgeRepository $edgeRepository;
    private NodeRepository $nodeRepository;

    public function _before(): void
    {
        parent::_before();

        $this->userEdgeRepository = helm(UserEdgeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);
        $this->nodeRepository = helm(NodeRepository::class);
    }

    public function tear_down(): void
    {
        Date::setTestNow(null);
        parent::tear_down();
    }

    private function createEdge(): int
    {
        $nodeA = $this->nodeRepository->create(0.0, 0.0, 0.0, type: NodeType::System);
        $nodeB = $this->nodeRepository->create(1.0, 0.0, 0.0, type: NodeType::System);
        return $this->edgeRepository->create($nodeA->id, $nodeB->id, 1.0)->id;
    }

    public function test_discovered_targets_are_scoped_to_player_origin_and_requested_nodes(): void
    {
        $left = $this->nodeRepository->create(0, 0, 0)->id;
        $origin = $this->nodeRepository->create(1, 0, 0)->id;
        $right = $this->nodeRepository->create(2, 0, 0)->id;
        $offPage = $this->nodeRepository->create(3, 0, 0)->id;
        $unknown = $this->nodeRepository->create(4, 0, 0)->id;
        $indirect = $this->nodeRepository->create(5, 0, 0)->id;
        $leftEdge = $this->edgeRepository->create($left, $origin, 1)->id;
        $rightEdge = $this->edgeRepository->create($origin, $right, 1)->id;
        $offPageEdge = $this->edgeRepository->create($origin, $offPage, 2)->id;
        $unknownEdge = $this->edgeRepository->create($origin, $unknown, 3)->id;
        $indirectEdge = $this->edgeRepository->create($right, $indirect, 3)->id;
        foreach ([$this->userEdgeRepository, new MemoryUserEdgeRepository($this->edgeRepository)] as $repository) {
            foreach ([$leftEdge, $rightEdge, $offPageEdge, $indirectEdge] as $edgeId) {
                $repository->upsert(42, $edgeId);
            }
            $repository->upsert(43, $unknownEdge);
            $result = $repository->discoveredTargets(42, $origin, [$left, $right, $unknown, $indirect, $left]);
            $this->assertEqualsCanonicalizing([$left, $right], $result);
            $this->assertSame([$unknown], $repository->discoveredTargets(43, $origin, [$left, $unknown]));
            $this->assertSame([], $repository->discoveredTargets(42, $origin, []));
        }
    }

    public function test_discovered_targets_uses_one_query_and_none_for_empty_input(): void
    {
        global $wpdb;
        $edge = $this->edgeRepository->get($this->createEdge());
        $this->userEdgeRepository->upsert(42, $edge->id);
        $before = $wpdb->num_queries;
        $this->assertSame([$edge->nodeBId], $this->userEdgeRepository->discoveredTargets(42, $edge->nodeAId, [$edge->nodeBId]));
        $this->assertSame($before + 1, $wpdb->num_queries);
        $before = $wpdb->num_queries;
        $this->assertSame([], $this->userEdgeRepository->discoveredTargets(42, $edge->nodeAId, []));
        $this->assertSame($before, $wpdb->num_queries);
    }

    public function test_nodes_with_discovered_edges_is_scoped_deduplicated_and_batched(): void
    {
        global $wpdb;
        $edge = $this->edgeRepository->get($this->createEdge());
        $otherEdge = $this->edgeRepository->get($this->createEdge());
        $extra = $this->edgeRepository->get($this->createEdge());
        $shared = $this->edgeRepository->create($edge->nodeAId, $extra->nodeAId, 1);
        foreach ([$this->userEdgeRepository, new MemoryUserEdgeRepository($this->edgeRepository)] as $repository) {
            $repository->upsert(42, $edge->id);
            $repository->upsert(42, $shared->id);
            $repository->upsert(43, $otherEdge->id);
            $before = $wpdb->num_queries;
            $result = $repository->nodesWithDiscoveredEdges(42, [$edge->nodeAId, $edge->nodeBId, $edge->nodeAId, $otherEdge->nodeAId]);
            if ($repository === $this->userEdgeRepository) {
                $this->assertSame($before + 1, $wpdb->num_queries);
            }
            $this->assertEqualsCanonicalizing([$edge->nodeAId, $edge->nodeBId], $result);
            $this->assertSame([$edge->nodeBId], $repository->nodesWithDiscoveredEdges(42, [$edge->nodeBId]));
            $this->assertSame([], $repository->nodesWithDiscoveredEdges(43, [$edge->nodeAId]));
            $this->assertSame([], $repository->nodesWithDiscoveredEdges(42, [999999999]));
            $before = $wpdb->num_queries;
            $this->assertSame([], $repository->nodesWithDiscoveredEdges(42, []));
            $this->assertSame($before, $wpdb->num_queries);
        }
    }

    public function test_node_lookup_limits_accept_boundary_and_reject_oversized_lists_before_queries(): void
    {
        global $wpdb;
        $edge = $this->edgeRepository->get($this->createEdge());
        foreach ([$this->userEdgeRepository, new MemoryUserEdgeRepository($this->edgeRepository)] as $repository) {
            $repository->upsert(42, $edge->id);
            $ids = array_fill(0, UserEdgeRepository::MAX_NODE_IDS, $edge->nodeBId);
            $this->assertSame([$edge->nodeBId], $repository->discoveredTargets(42, $edge->nodeAId, $ids));
            $this->assertSame([$edge->nodeBId], $repository->nodesWithDiscoveredEdges(42, $ids));
            foreach ([array_fill(0, 101, $edge->nodeBId), range(1, 101)] as $oversized) {
                foreach (['discoveredTargets', 'nodesWithDiscoveredEdges'] as $method) {
                    $before = $wpdb->num_queries;
                    try {
                        if ($method === 'discoveredTargets') {
                            $repository->discoveredTargets(42, $edge->nodeAId, $oversized);
                        } else {
                            $repository->nodesWithDiscoveredEdges(42, $oversized);
                        }
                        $this->fail('Expected an oversized node list to be rejected.');
                    } catch (InvalidArgumentException $error) {
                        $this->assertSame('Node lookup accepts at most 100 IDs; received 101.', $error->getMessage());
                    }
                    $this->assertSame($before, $wpdb->num_queries);
                }
            }
        }
    }

    public function test_from_node_filters_player_and_endpoints_and_orders_like_frontend(): void
    {
        Date::setTestNow(new DateTimeImmutable('2026-01-01T00:00:00+00:00'));
        $left = $this->nodeRepository->create(0, 0, 0)->id;
        $center = $this->nodeRepository->create(1, 0, 0)->id;
        $right = $this->nodeRepository->create(2, 0, 0)->id;
        $a = $this->edgeRepository->create($left, $center, 1)->id;
        $b = $this->edgeRepository->create($center, $right, 1)->id;
        $unrelated = $this->edgeRepository->create($left, $right, 2)->id;
        foreach ([$this->userEdgeRepository, new MemoryUserEdgeRepository($this->edgeRepository)] as $repository) {
            $repository->upsert(43, $b);
            $repository->upsert(42, $unrelated);
            $repository->upsert(42, $b);
            $repository->upsert(42, $a);
            $this->assertSame([$a, $b], array_column($repository->fromNode(42, $center), 'edgeId'));
            $this->assertSame([$b], array_column($repository->fromNode(43, $center), 'edgeId'));
            $this->assertSame([], $repository->fromNode(44, $center));
        }
    }

    public function test_upsert_inserts_a_new_discovery(): void
    {
        $edgeId = $this->createEdge();
        $userId = 42;

        $this->userEdgeRepository->upsert($userId, $edgeId);

        $this->assertSame(1, $this->userEdgeRepository->count($userId));
        $result = $this->userEdgeRepository->paginate($userId, 1, 100);
        $this->assertSame(1, $result['total']);
        $this->assertCount(1, $result['edges']);
        $this->assertSame($userId, $result['edges'][0]->userId);
        $this->assertSame($edgeId, $result['edges'][0]->edgeId);
    }

    public function test_upsert_is_idempotent(): void
    {
        $edgeId = $this->createEdge();
        $userId = 42;

        $this->userEdgeRepository->upsert($userId, $edgeId);
        $this->userEdgeRepository->upsert($userId, $edgeId);
        $this->userEdgeRepository->upsert($userId, $edgeId);

        $this->assertSame(1, $this->userEdgeRepository->count($userId));
    }

    public function test_upsert_preserves_original_discovered_at_on_repeat(): void
    {
        $edgeId = $this->createEdge();
        $userId = 42;

        Date::setTestNow(new \DateTimeImmutable('2026-04-01 00:00:00', new \DateTimeZone('UTC')));
        $this->userEdgeRepository->upsert($userId, $edgeId);
        $firstDiscovery = $this->userEdgeRepository->lastDiscovered($userId);

        Date::setTestNow(new \DateTimeImmutable('2026-04-19 00:00:00', new \DateTimeZone('UTC')));
        $this->userEdgeRepository->upsert($userId, $edgeId);
        $secondDiscovery = $this->userEdgeRepository->lastDiscovered($userId);

        $this->assertSame($firstDiscovery, $secondDiscovery);
    }

    public function test_last_discovered_is_max_across_users_rows(): void
    {
        $edgeA = $this->createEdge();
        $edgeB = $this->createEdge();
        $userId = 42;

        Date::setTestNow(new \DateTimeImmutable('2026-04-01 00:00:00', new \DateTimeZone('UTC')));
        $this->userEdgeRepository->upsert($userId, $edgeA);

        Date::setTestNow(new \DateTimeImmutable('2026-04-19 12:34:56', new \DateTimeZone('UTC')));
        $this->userEdgeRepository->upsert($userId, $edgeB);

        $this->assertSame('2026-04-19T12:34:56+00:00', $this->userEdgeRepository->lastDiscovered($userId));
    }

    public function test_paginate_and_count_scope_by_user(): void
    {
        $edgeA = $this->createEdge();
        $edgeB = $this->createEdge();

        $this->userEdgeRepository->upsert(1, $edgeA);
        $this->userEdgeRepository->upsert(1, $edgeB);
        $this->userEdgeRepository->upsert(2, $edgeA);

        $this->assertSame(2, $this->userEdgeRepository->count(1));
        $this->assertSame(1, $this->userEdgeRepository->count(2));
        $this->assertSame(0, $this->userEdgeRepository->count(3));

        $user2Result = $this->userEdgeRepository->paginate(2, 1, 100);
        $this->assertSame(1, $user2Result['total']);
        $this->assertCount(1, $user2Result['edges']);
        $this->assertSame($edgeA, $user2Result['edges'][0]->edgeId);
    }

    public function test_paginate_respects_page_and_per_page(): void
    {
        $userId = 42;
        $edges = [];
        for ($i = 0; $i < 5; $i++) {
            $edgeId = $this->createEdge();
            $this->userEdgeRepository->upsert($userId, $edgeId);
            $edges[] = $edgeId;
        }

        $pageOne = $this->userEdgeRepository->paginate($userId, 1, 2);
        $this->assertSame(5, $pageOne['total']);
        $this->assertCount(2, $pageOne['edges']);

        $pageThree = $this->userEdgeRepository->paginate($userId, 3, 2);
        $this->assertSame(5, $pageThree['total']);
        $this->assertCount(1, $pageThree['edges']);
    }

    public function test_get_many_returns_only_requested_edges_for_user(): void
    {
        $edgeA = $this->createEdge();
        $edgeB = $this->createEdge();
        $edgeC = $this->createEdge();

        $this->userEdgeRepository->upsert(1, $edgeA);
        $this->userEdgeRepository->upsert(1, $edgeB);
        $this->userEdgeRepository->upsert(2, $edgeC);

        $edges = $this->userEdgeRepository->getMany(1, [$edgeA, $edgeC, $edgeA]);
        $edgeIds = array_map(fn ($edge) => $edge->edgeId, $edges);

        $this->assertSame([$edgeA], $edgeIds);
    }

    public function test_last_discovered_is_null_for_user_with_no_rows(): void
    {
        $this->assertNull($this->userEdgeRepository->lastDiscovered(99));
    }
}
