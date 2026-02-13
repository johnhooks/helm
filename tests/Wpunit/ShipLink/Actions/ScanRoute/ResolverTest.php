<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\ScanRoute;

use Helm\Navigation\NavigationService;
use Helm\Navigation\NodeRepository;
use Helm\ShipLink\Actions\ScanRoute\Resolver;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\ShipFactory;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\Actions\ScanRoute\Resolver
 *
 * @property WpunitTester $tester
 */
class ResolverTest extends WPTestCase
{
    private Resolver $resolver;
    private ShipFactory $shipFactory;
    private NodeRepository $nodeRepository;

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();

        $this->resolver = new Resolver(helm(NavigationService::class));
        $this->shipFactory = helm(ShipFactory::class);
        $this->nodeRepository = helm(NodeRepository::class);
    }

    public function test_updates_result_with_scan_outcome(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'SCAN_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'SCAN_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::ScanRoute,
            'params' => ['target_node_id' => $node2->id],
            'result' => [
                'from_node_id' => $node1->id,
                'to_node_id' => $node2->id,
                'skill' => 1.0,
                'efficiency' => 1.0,
                'duration' => 3600,
            ],
        ]);

        $this->resolver->handle($action, $ship);

        // Original values preserved
        $this->assertSame($node1->id, $action->result['from_node_id']);
        $this->assertSame($node2->id, $action->result['to_node_id']);
        $this->assertSame(1.0, $action->result['skill']);
        $this->assertSame(1.0, $action->result['efficiency']);

        // Scan outcome added
        $this->assertArrayHasKey('success', $action->result);
        $this->assertArrayHasKey('complete', $action->result);
        $this->assertArrayHasKey('edges_discovered', $action->result);
        $this->assertArrayHasKey('waypoints_created', $action->result);
        $this->assertArrayHasKey('path', $action->result);
        $this->assertArrayHasKey('nodes', $action->result);
        $this->assertArrayHasKey('edges', $action->result);

        $this->assertIsBool($action->result['success']);
        $this->assertIsBool($action->result['complete']);
        $this->assertIsInt($action->result['edges_discovered']);
        $this->assertIsInt($action->result['waypoints_created']);
        $this->assertIsArray($action->result['path']);
        $this->assertIsArray($action->result['nodes']);
        $this->assertIsArray($action->result['edges']);
    }

    public function test_serializes_node_and_edge_objects_on_success(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'SERIAL_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'SERIAL_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::ScanRoute,
            'params' => ['target_node_id' => $node2->id],
            'result' => [
                'from_node_id' => $node1->id,
                'to_node_id' => $node2->id,
                'skill' => 1.0,
                'efficiency' => 1.0,
                'duration' => 3600,
            ],
        ]);

        $this->resolver->handle($action, $ship);

        if (! $action->result['success']) {
            $this->markTestSkipped('Scan did not succeed - probabilistic outcome');
        }

        // Verify node structure
        $this->assertNotEmpty($action->result['nodes']);
        $firstNode = $action->result['nodes'][0];
        $this->assertArrayHasKey('id', $firstNode);
        $this->assertArrayHasKey('type', $firstNode);
        $this->assertArrayHasKey('x', $firstNode);
        $this->assertArrayHasKey('y', $firstNode);
        $this->assertArrayHasKey('z', $firstNode);
        $this->assertContains($firstNode['type'], ['system', 'waypoint']);

        // Verify edge structure
        $this->assertNotEmpty($action->result['edges']);
        $firstEdge = $action->result['edges'][0];
        $this->assertArrayHasKey('id', $firstEdge);
        $this->assertArrayHasKey('node_a_id', $firstEdge);
        $this->assertArrayHasKey('node_b_id', $firstEdge);
        $this->assertArrayHasKey('distance', $firstEdge);

        // Path should match node IDs
        $this->assertCount(count($action->result['nodes']), $action->result['path']);
        // edges_discovered should match edges array length
        $this->assertSame($action->result['edges_discovered'], count($action->result['edges']));
    }

    public function test_failed_scan_still_completes(): void
    {
        // Create stars very far apart - scan unlikely to succeed
        $star1 = $this->tester->haveStar(['id' => 'FAR_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'FAR_TO', 'distanceLy' => 1000.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::ScanRoute,
            'params' => ['target_node_id' => $node2->id],
            'result' => [
                'from_node_id' => $node1->id,
                'to_node_id' => $node2->id,
                'skill' => 0.1,
                'efficiency' => 0.1,
                'duration' => 36000,
            ],
        ]);

        // Should not throw - failed scan is still a valid completion
        $this->resolver->handle($action, $ship);

        $this->assertIsBool($action->result['success']);
        $this->assertIsInt($action->result['edges_discovered']);
        $this->assertIsInt($action->result['waypoints_created']);
        $this->assertIsArray($action->result['path']);
        $this->assertIsArray($action->result['nodes']);
        $this->assertIsArray($action->result['edges']);
    }
}
