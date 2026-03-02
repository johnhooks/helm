<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\Jump;

use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\ShipLink\Actions\Jump\Resolver;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\ShipFactory;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\Actions\Jump\Resolver
 *
 * @property WpunitTester $tester
 */
class ResolverTest extends WPTestCase
{
    private Resolver $resolver;
    private ShipFactory $shipFactory;
    private NodeRepository $nodeRepository;
    private EdgeRepository $edgeRepository;

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();

        $this->resolver = new Resolver();
        $this->shipFactory = helm(ShipFactory::class);
        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);
    }

    public function test_updates_result_with_final_values(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'RES_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'RES_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $this->edgeRepository->create($node1->id, $node2->id, 5.0);

        $initialCore = 1000;
        $coreCost = 10.0;
        $shipPost = $this->tester->haveShip(['node_id' => $node1->id, 'core_life' => $initialCore]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => $node2->id],
            'result' => [
                'from_node_id' => $node1->id,
                'to_node_id' => $node2->id,
                'distance' => 5.0,
                'core_cost' => $coreCost,
                'duration' => 3600,
            ],
        ]);

        $this->resolver->handle($action, $ship);

        // Original values preserved
        $this->assertSame($node1->id, $action->result['from_node_id']);
        $this->assertSame($node2->id, $action->result['to_node_id']);
        $this->assertSame(5.0, $action->result['distance']);
        $this->assertSame($coreCost, $action->result['core_cost']);

        // Final values added
        $this->assertArrayHasKey('remaining_core_life', $action->result);
        $this->assertArrayHasKey('core_before', $action->result);
        // core_life is now int; ceil(10.0) = 10, so 1000 - 10 = 990
        $this->assertSame($initialCore - (int) ceil($coreCost), $action->result['remaining_core_life']);
        $this->assertSame($initialCore, $action->result['core_before']);
    }

    public function test_core_floors_at_zero(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'ZERO_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'ZERO_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        // Ship has less core than the cost
        $shipPost = $this->tester->haveShip(['node_id' => $node1->id, 'core_life' => 10]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => $node2->id],
            'result' => [
                'from_node_id' => $node1->id,
                'to_node_id' => $node2->id,
                'distance' => 5.0,
                'core_cost' => 50.0,  // More than available
                'duration' => 3600,
            ],
        ]);

        $this->resolver->handle($action, $ship);

        // Core should floor at 0, not go negative (int)
        $this->assertSame(0, $action->result['remaining_core_life']);
    }
}
