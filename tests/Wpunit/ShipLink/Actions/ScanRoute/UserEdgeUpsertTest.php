<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\ScanRoute;

use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\Edge;
use Helm\Navigation\NavigationService;
use Helm\Navigation\Node;
use Helm\Navigation\NodeType;
use Helm\ShipLink\Actions\ScanRoute\Resolver;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\ShipFactory;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\Actions\ScanRoute\Resolver
 *
 * Verifies the resolver's wiring to UserEdgeRepository. Repository semantics
 * (idempotency, freshness, scoping aggregates) are covered in
 * UserEdgeRepositoryTest; here we only care that the resolver upserts the edge
 * discovered by the current scan phase for the ship owner's user id.
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
     * @return array{0: Node, 1: Node, 2: Edge}
     */
    private function seedDirectGraph(): array
    {
        $from = $this->nodeRepository->create(0.0, 0.0, 0.0, type: NodeType::System);
        $to = $this->nodeRepository->create(5.0, 0.0, 0.0, type: NodeType::System);
        $edge = $this->edgeRepository->create($from->id, $to->id, 5.0);

        return [$from, $to, $edge];
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
                'duration' => 300,
                'cycle_seconds' => 300,
                'phases' => [],
            ],
        ]);
    }

    public function test_resolver_upserts_each_discovered_edge_for_the_owning_user(): void
    {
        $userId = self::factory()->user->create(['role' => 'subscriber']);

        [$from, $to] = $this->seedDirectGraph();

        $shipPost = $this->tester->haveShip([
            'node_id' => $from->id,
            'ownerId' => $userId,
        ]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $resolver = new Resolver(
            helm(NavigationService::class),
            $this->userEdgeRepository,
        );

        $action = $this->buildAction($from->id, $to->id, $shipPost->postId());
        $resolver->handle($action, $ship);

        $this->assertTrue($action->result['success']);
        $this->assertSame(1, $this->userEdgeRepository->count($userId));

        $knownEdgeIds = array_map(
            static fn ($ue) => $ue->edgeId,
            $this->userEdgeRepository->paginate($userId, 1, 100)['edges'],
        );
        $this->assertContains($action->result['discovered_edge_ids'][0], $knownEdgeIds);
    }

    public function test_resolver_upserts_only_for_the_ships_owner(): void
    {
        $owner = self::factory()->user->create(['role' => 'subscriber']);
        $other = self::factory()->user->create(['role' => 'subscriber']);

        [$from, $to] = $this->seedDirectGraph();

        $shipPost = $this->tester->haveShip([
            'node_id' => $from->id,
            'ownerId' => $owner,
        ]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $resolver = new Resolver(
            helm(NavigationService::class),
            $this->userEdgeRepository,
        );

        $action = $this->buildAction($from->id, $to->id, $shipPost->postId());
        $resolver->handle($action, $ship);

        $this->assertSame(1, $this->userEdgeRepository->count($owner));
        $this->assertSame(0, $this->userEdgeRepository->count($other));
    }
}
