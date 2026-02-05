<?php

declare(strict_types=1);

namespace Tests\Wpunit\Rest;

use Helm\Navigation\EdgeRepository;
use Helm\Navigation\NodeRepository;
use Helm\ShipLink\ActionStatus;
use Helm\Ships\ShipPost;
use lucatume\WPBrowser\TestCase\WPRestApiTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Rest\ShipActionsController
 *
 * @property WpunitTester $tester
 */
class ShipActionsControllerTest extends WPRestApiTestCase
{
    private const ROUTE = '/helm/v1/ships/(?P<id>\\d+)/actions';

    private NodeRepository $nodeRepository;
    private EdgeRepository $edgeRepository;

    private int $ownerId;
    private int $otherId;

    /** @var int Node ID for the "from" star. */
    private int $fromNodeId;

    /** @var int Node ID for the "to" star. */
    private int $toNodeId;

    /**
     * Create test fixtures inside the WPLoader transaction.
     *
     * Data creation must happen in set_up() (not _before()) because
     * wp-browser calls _before() BEFORE start_transaction(). Any data
     * created in _before() would be auto-committed and leak across tests.
     */
    public function set_up(): void
    {
        parent::set_up();

        $this->tester->haveOrigin();

        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);

        // Create two stars with a navigation edge.
        $star1 = $this->tester->haveStar(['id' => 'REST_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'REST_TO', 'distanceLy' => 5.0]);

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $this->edgeRepository->create($node1->id, $node2->id, 5.0);

        $this->fromNodeId = $node1->id;
        $this->toNodeId   = $node2->id;

        // Create users.
        $this->ownerId = self::factory()->user->create(['role' => 'subscriber']);
        $this->otherId = self::factory()->user->create(['role' => 'subscriber']);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    /**
     * Create a ship owned by the test owner, positioned at the "from" node.
     *
     * @param array<string, mixed> $overrides
     */
    private function createShip(array $overrides = []): ShipPost
    {
        return $this->tester->haveShip(array_merge([
            'ownerId'   => $this->ownerId,
            'node_id'   => $this->fromNodeId,
            'core_life' => 1000.0,
        ], $overrides));
    }

    // ------------------------------------------------------------------
    // Tests
    // ------------------------------------------------------------------

    public function test_register_routes(): void
    {
        $routes = rest_get_server()->get_routes();

        $this->assertArrayHasKey('/helm/v1/ships/(?P<id>\\d+)/actions', $routes);
    }

    public function test_requires_authentication(): void
    {
        $ship = $this->createShip();

        wp_set_current_user(0);
        $response = $this->tester->postAction($ship->postId(), [
            'type' => 'jump',
        ]);

        $this->assertErrorResponse('rest_not_logged_in', $response, 401);
    }

    public function test_rejects_non_owner(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->otherId);
        $response = $this->tester->postAction($ship->postId(), [
            'type' => 'jump',
        ]);

        $this->assertErrorResponse('rest_forbidden', $response, 403);
    }

    public function test_returns_404_for_missing_ship(): void
    {
        wp_set_current_user($this->ownerId);
        $response = $this->tester->postAction(999999, [
            'type' => 'jump',
        ]);

        $this->assertErrorResponse('helm.ship.not_found', $response, 404);
    }

    public function test_returns_404_for_non_ship_post(): void
    {
        $pageId = self::factory()->post->create(['post_type' => 'page']);

        wp_set_current_user($this->ownerId);
        $response = $this->tester->postAction($pageId, [
            'type' => 'jump',
        ]);

        $this->assertErrorResponse('helm.ship.not_found', $response, 404);
    }

    public function test_rejects_invalid_action_type(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->tester->postAction($ship->postId(), [
            'type' => 'bogus',
        ]);

        $this->assertErrorResponse('rest_invalid_param', $response, 400);
    }

    public function test_creates_action_successfully(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->tester->postAction($ship->postId(), [
            'type'   => 'jump',
            'params' => ['target_node_id' => $this->toNodeId],
        ]);

        $this->assertSame(201, $response->get_status());

        $data = $response->get_data();
        $this->assertSame($ship->postId(), $data['ship_post_id']);
        $this->assertSame('jump', $data['type']);
        $this->assertSame(ActionStatus::Pending->value, $data['status']);
    }

    public function test_response_contains_action_fields(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->tester->postAction($ship->postId(), [
            'type'   => 'jump',
            'params' => ['target_node_id' => $this->toNodeId],
        ]);

        $data = $response->get_data();

        $expected = [
            'id',
            'ship_post_id',
            'type',
            'status',
            'params',
            'result',
            'deferred_until',
            'created_at',
            'updated_at',
        ];

        foreach ($expected as $key) {
            $this->assertArrayHasKey($key, $data, "Missing key: {$key}");
        }
    }

    public function test_returns_409_when_ship_busy(): void
    {
        $ship = $this->createShip(['current_action_id' => 999]);

        wp_set_current_user($this->ownerId);
        $response = $this->tester->postAction($ship->postId(), [
            'type'   => 'jump',
            'params' => ['target_node_id' => $this->toNodeId],
        ]);

        $this->assertErrorResponse('helm.action.in_progress', $response, 409);
    }

    public function test_returns_422_for_validation_error(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->tester->postAction($ship->postId(), [
            'type'   => 'jump',
            'params' => [],
        ]);

        $this->assertErrorResponse('helm.navigation.missing_target', $response, 422);
    }

    public function test_params_default_to_empty(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);

        // Omit params entirely — should default to [] and hit validation,
        // not a fatal error about missing params.
        $response = $this->tester->postAction($ship->postId(), [
            'type' => 'jump',
        ]);

        // The jump validator requires target_node_id, so we expect a validation
        // error — not a crash. This proves params defaults to [].
        $this->assertErrorResponse('helm.navigation.missing_target', $response, 422);
    }
}
