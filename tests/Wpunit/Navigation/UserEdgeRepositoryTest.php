<?php

declare(strict_types=1);

namespace Tests\Wpunit\Navigation;

use Helm\Lib\Date;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\NodeType;
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

    public function test_last_discovered_is_null_for_user_with_no_rows(): void
    {
        $this->assertNull($this->userEdgeRepository->lastDiscovered(99));
    }
}
