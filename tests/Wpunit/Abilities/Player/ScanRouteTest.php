<?php

declare(strict_types=1);

namespace Tests\Wpunit\Abilities\Player;

use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\Ships\ShipPost;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;
use WP_REST_Request;

/**
 * @covers \Helm\Abilities\Player\ScanRoute
 * @property WpunitTester $tester
 */
class ScanRouteTest extends WPTestCase
{
    private int $owner;
    private int $other;
    private int $origin;
    private int $target;
    private ShipPost $ship;

    public function set_up(): void
    {
        parent::set_up();
        $this->tester->haveOrigin();
        $this->owner = self::factory()->user->create(['role' => 'subscriber']);
        $this->other = self::factory()->user->create(['role' => 'subscriber']);
        $from = $this->tester->haveStar(['id' => 'ABILITY_FROM', 'distanceLy' => 0.0]);
        $this->origin = $this->tester->getNodeForStar($from)->id;
        $to = $this->tester->haveStar(['id' => 'ABILITY_TO', 'distanceLy' => 1.0]);
        $this->target = $this->tester->getNodeForStar($to)->id;
        $this->ship = $this->tester->haveShip([
            'ownerId' => $this->owner, 'node_id' => $this->origin, 'core_life' => 1000.0,
        ]);
        wp_set_current_user($this->owner);
    }

    public function test_scan_uses_real_action_factory_and_public_serialization(): void
    {
        $ability = wp_get_ability('helm/scan-route');
        $input = ['ship_id' => $this->ship->postId(), 'target_node_id' => $this->target];
        $action = $ability->execute($input);
        $this->assertIsArray($action);
        $this->assertSame('pending', $action['status']);
        $this->assertNotNull($action['deferred_until']);
        $this->assertNull($action['result']);
        $this->assertArrayNotHasKey('runtime_state', $action);
        $stored = helm(ActionRepository::class)->find($action['id']);
        $this->assertNotEmpty($stored->runtime_state);
        $this->assertSame($action['id'], helm(ShipStateRepository::class)->find($this->ship->postId())->current_action_id);
        $this->assertWPError($ability->execute($input));
    }

    public function test_validates_inputs_before_creating_an_action(): void
    {
        $ability = wp_get_ability('helm/scan-route');
        foreach (
            [
            [],
            ['ship_id' => -1, 'target_node_id' => $this->target],
            ['ship_id' => $this->ship->postId(), 'target_node_id' => $this->target, 'runtime_state' => []],
            ] as $input
        ) {
            $this->assertWPError($ability->execute($input));
        }
        $this->assertNull(helm(ShipStateRepository::class)->find($this->ship->postId())->current_action_id);
    }

    public function test_rest_scan_submission_requires_post_and_returns_a_scheduled_action(): void
    {
        $route = '/wp-abilities/v1/abilities/helm/scan-route/run';
        $input = ['ship_id' => $this->ship->postId(), 'target_node_id' => $this->target];
        $read = new WP_REST_Request('GET', $route);
        $read->set_param('input', $input);
        $this->assertGreaterThanOrEqual(400, rest_do_request($read)->get_status());
        $this->assertNull(helm(ShipStateRepository::class)->find($this->ship->postId())->current_action_id);

        $write = new WP_REST_Request('POST', $route);
        $write->set_header('Content-Type', 'application/json');
        $write->set_body(wp_json_encode(['input' => $input]));
        $response = rest_do_request($write);
        $this->assertSame(200, $response->get_status());
        $this->assertSame('pending', $response->get_data()['status']);
        $this->assertNotNull($response->get_data()['deferred_until']);
        $this->assertArrayNotHasKey('runtime_state', $response->get_data());
    }

    public function test_accepts_integer_strings(): void
    {
        $action = wp_get_ability('helm/scan-route')->execute([
            'ship_id' => (string) $this->ship->postId(),
            'target_node_id' => (string) $this->target,
        ]);
        $this->assertIsArray($action);
        $this->assertSame($this->target, $action['params']['target_node_id']);
    }

    public function test_rejects_unauthorized_calls_without_side_effects(): void
    {
        $this->setExpectedIncorrectUsage('WP_Ability::execute');
        foreach ([0, $this->other] as $user) {
            wp_set_current_user($user);
            $this->assertWPError(wp_get_ability('helm/scan-route')->execute(['ship_id' => $this->ship->postId(), 'target_node_id' => $this->target]));
        }
        $this->assertNull(helm(ShipStateRepository::class)->find($this->ship->postId())->current_action_id);
    }
}
