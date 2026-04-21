<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\ScanRoute;

use Codeception\Stub;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\Edge;
use Helm\Navigation\NavigationService;
use Helm\Navigation\Node;
use Helm\Navigation\NodeType;
use Helm\Navigation\ScanResult;
use Helm\ShipLink\Actions\ScanRoute\Resolver;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\ShipFactory;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\Actions\ScanRoute\Resolver
 *
 * Verifies the resolver's wiring to UserEdgeRepository. NavigationService
 * is stubbed to return a canned ScanResult so the test does not depend on
 * the probabilistic waypoint discovery logic. Repository semantics
 * (idempotency, freshness, scoping aggregates) are covered in
 * UserEdgeRepositoryTest; here we only care that the resolver upserts
 * one row per scan-result edge, keyed to the ship owner's user id.
 *
 * @property WpunitTester $tester
 */
class UserEdgeUpsertTest extends WPTestCase
{
    private ShipFactory $shipFactory;
    private NodeRepository $nodeRepository;
    private EdgeRepository $edgeRepository;
    private UserEdgeRepository $userEdgeRepository;

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();

        $this->shipFactory = helm(ShipFactory::class);
        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);
        $this->userEdgeRepository = helm(UserEdgeRepository::class);
    }

    /**
     * @param Edge[] $edges
     */
    private function stubNavigationService(Node $from, Node $to, array $edges): NavigationService
    {
        $result = ScanResult::success(
            nodes: [$to],
            edges: $edges,
            complete: true,
        );

        return Stub::make(NavigationService::class, [
            'scan' => fn () => $result,
        ], $this);
    }

    /**
     * @return array{0: Node, 1: Node, 2: Edge[]}
     */
    private function seedGraph(int $edgeCount = 2): array
    {
        $from = $this->nodeRepository->create(0.0, 0.0, 0.0, type: NodeType::System);
        $to = $this->nodeRepository->create(5.0, 0.0, 0.0, type: NodeType::System);

        $edges = [];
        $prev = $from;
        for ($i = 1; $i <= $edgeCount; $i++) {
            $next = $i === $edgeCount
                ? $to
                : $this->nodeRepository->create((float) $i, 0.0, 0.0, type: NodeType::Waypoint);
            $edges[] = $this->edgeRepository->create($prev->id, $next->id, 1.0);
            $prev = $next;
        }

        return [$from, $to, $edges];
    }

    private function buildAction(int $fromNodeId, int $toNodeId, int $shipPostId): Action
    {
        return new Action([
            'ship_post_id' => $shipPostId,
            'type' => ActionType::ScanRoute,
            'params' => ['target_node_id' => $toNodeId],
            'result' => [
                'from_node_id' => $fromNodeId,
                'to_node_id' => $toNodeId,
                'skill' => 1.0,
                'efficiency' => 1.0,
                'duration' => 3600,
            ],
        ]);
    }

    public function test_resolver_upserts_each_discovered_edge_for_the_owning_user(): void
    {
        $userId = self::factory()->user->create(['role' => 'subscriber']);

        [$from, $to, $edges] = $this->seedGraph(edgeCount: 3);

        $shipPost = $this->tester->haveShip([
            'node_id' => $from->id,
            'ownerId' => $userId,
        ]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $resolver = new Resolver(
            $this->stubNavigationService($from, $to, $edges),
            $this->userEdgeRepository,
        );

        $action = $this->buildAction($from->id, $to->id, $shipPost->postId());
        $resolver->handle($action, $ship);

        $this->assertTrue($action->result['success']);
        $this->assertSame(3, $this->userEdgeRepository->count($userId));

        $knownEdgeIds = array_map(
            static fn ($ue) => $ue->edgeId,
            $this->userEdgeRepository->paginate($userId, 1, 100)['edges'],
        );
        foreach ($edges as $edge) {
            $this->assertContains($edge->id, $knownEdgeIds);
        }
    }

    public function test_resolver_upserts_only_for_the_ships_owner(): void
    {
        $owner = self::factory()->user->create(['role' => 'subscriber']);
        $other = self::factory()->user->create(['role' => 'subscriber']);

        [$from, $to, $edges] = $this->seedGraph(edgeCount: 2);

        $shipPost = $this->tester->haveShip([
            'node_id' => $from->id,
            'ownerId' => $owner,
        ]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $resolver = new Resolver(
            $this->stubNavigationService($from, $to, $edges),
            $this->userEdgeRepository,
        );

        $action = $this->buildAction($from->id, $to->id, $shipPost->postId());
        $resolver->handle($action, $ship);

        $this->assertSame(2, $this->userEdgeRepository->count($owner));
        $this->assertSame(0, $this->userEdgeRepository->count($other));
    }
}
