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
use Helm\Navigation\ScanPhaseResult;
use Helm\ShipLink\Actions\ScanRoute\Resolver;
use Helm\ShipLink\ActionStatus;
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
 * discovered by the current scan cycle for the ship owner's user id.
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

    private function makeResolver(Node $node, Edge $edge): Resolver
    {
        return new Resolver(
            Stub::make(NavigationService::class, [
                'scanNextHop' => static fn () => ScanPhaseResult::direct($node, $edge),
            ], $this),
            $this->userEdgeRepository,
        );
    }

    private function buildAction(int $fromNodeId, int $toNodeId, int $shipPostId): Action
    {
        return new Action([
            'ship_post_id' => $shipPostId,
            'type' => ActionType::ScanRoute,
            'status' => ActionStatus::Running,
            'params' => [
                'target_node_id' => $toNodeId,
                'from_node_id' => $fromNodeId,
            ],
            'runtime_state' => [
                'cycle_index' => 1,
                'cycle_seconds' => 300,
                'max_cycles' => 50,
                'started_at' => '2026-04-01 00:00:00',
                'cycles' => [],
            ],
        ]);
    }

    public function test_resolver_upserts_the_discovered_edge_for_the_owning_user(): void
    {
        $userId = self::factory()->user->create(['role' => 'subscriber']);

        [$from, $to, $edge] = $this->seedDirectGraph();

        $shipPost = $this->tester->haveShip([
            'node_id' => $from->id,
            'ownerId' => $userId,
        ]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = $this->buildAction($from->id, $to->id, $shipPost->postId());
        $this->makeResolver($to, $edge)->handle($action, $ship);

        $this->assertSame(ActionStatus::Fulfilled, $action->status);
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

        [$from, $to, $edge] = $this->seedDirectGraph();

        $shipPost = $this->tester->haveShip([
            'node_id' => $from->id,
            'ownerId' => $owner,
        ]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = $this->buildAction($from->id, $to->id, $shipPost->postId());
        $this->makeResolver($to, $edge)->handle($action, $ship);

        $this->assertSame(1, $this->userEdgeRepository->count($owner));
        $this->assertSame(0, $this->userEdgeRepository->count($other));
    }
}
