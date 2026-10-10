<?php

declare(strict_types=1);

namespace Tests\Wpunit\Abilities;

use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\Ships\ShipPost;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Abilities\PlayerAbilities
 * @covers \Helm\Abilities\Provider
 * @property WpunitTester $tester
 */
class PlayerAbilitiesTest extends WPTestCase
{
    private int $owner;
    private int $other;
    private int $origin;
    private int $target;
    private int $edge;
    private ShipPost $ship;

    public function set_up(): void
    {
        parent::set_up();
        $this->tester->haveOrigin();
        $this->owner = self::factory()->user->create(['role' => 'subscriber']);
        $this->other = self::factory()->user->create(['role' => 'subscriber']);
        $from = $this->tester->haveStar(['id' => 'ABILITY_FROM', 'distanceLy' => 0.0]);
        $to = $this->tester->haveStar(['id' => 'ABILITY_TO', 'distanceLy' => 1.0]);
        $this->origin = $this->tester->getNodeForStar($from)->id;
        $this->target = $this->tester->getNodeForStar($to)->id;
        $this->edge = helm(EdgeRepository::class)->create($this->origin, $this->target, 1.0)->id;
        helm(UserEdgeRepository::class)->upsert($this->owner, $this->edge);
        $this->ship = $this->tester->haveShip([
            'ownerId' => $this->owner, 'node_id' => $this->origin, 'core_life' => 1000.0,
        ]);
        wp_set_current_user($this->owner);
    }

    public function test_registers_discoverable_abilities_with_correct_annotations(): void
    {
        foreach (['list-ships', 'inspect-ship', 'list-scan-targets', 'list-known-edges', 'get-action', 'scan-route', 'jump'] as $name) {
            $ability = wp_get_ability('helm/' . $name);
            $this->assertNotNull($ability);
            $this->assertSame('helm', $ability->get_category());
            $this->assertTrue($ability->get_meta_item('show_in_rest'));
            $this->assertTrue($ability->get_meta_item('mcp')['public']);
            $readonly = ! in_array($name, ['scan-route', 'jump'], true);
            $this->assertSame($readonly, $ability->get_meta_item('annotations')['readonly']);
            $this->assertSame($readonly, $ability->get_meta_item('annotations')['idempotent']);
        }
    }

    public function test_lists_only_owned_ships_with_pagination(): void
    {
        $this->tester->haveShip(['ownerId' => $this->other, 'node_id' => $this->origin]);
        $this->tester->haveShip(['ownerId' => $this->owner, 'node_id' => $this->origin]);
        $ability = wp_get_ability('helm/list-ships');
        $first = $ability->execute(['per_page' => 1]);
        $this->assertIsArray($first);
        $this->assertCount(1, $first['ships']);
        $this->assertSame($this->ship->postId(), $first['ships'][0]['ship_id']);
        $this->assertSame(2, $first['total']);
        $this->assertTrue($first['has_more']);
        $second = $ability->execute(['page' => 2, 'per_page' => 1]);
        $this->assertNotSame($first['ships'], $second['ships']);
        $this->assertFalse($second['has_more']);
    }

    public function test_inspects_effective_ship_readings_and_scan_targets(): void
    {
        $input = ['ship_id' => $this->ship->postId()];
        $result = wp_get_ability('helm/inspect-ship')->execute($input);
        $this->assertIsArray($result);
        $this->assertSame($this->origin, $result['state']['node_id']);
        $this->assertGreaterThan(0, $result['sensor_range_ly']);
        $this->assertGreaterThan(0, $result['jump_range_ly']);
        $targets = wp_get_ability('helm/list-scan-targets')->execute($input);
        $this->assertIsArray($targets);
        $this->assertContains($this->target, array_column($targets['targets'], 'node_id'));
        foreach ($targets['targets'] as $target) {
            $this->assertArrayNotHasKey('has_route', $target);
        }
    }

    public function test_does_not_expose_another_players_edges(): void
    {
        $ability = wp_get_ability('helm/list-known-edges');
        $result = $ability->execute([]);
        $this->assertSame([$this->edge], array_column($result['edges'], 'id'));
        wp_set_current_user($this->other);
        $result = $ability->execute([]);
        $this->assertSame([], $result['edges']);
        $this->assertSame(0, $result['total']);
    }

    public function test_rejects_anonymous_and_non_owner_calls_without_side_effects(): void
    {
        $this->setExpectedIncorrectUsage('WP_Ability::execute');
        $inputs = [
            'inspect-ship' => ['ship_id' => $this->ship->postId()],
            'list-scan-targets' => ['ship_id' => $this->ship->postId()],
            'scan-route' => ['ship_id' => $this->ship->postId(), 'target_node_id' => $this->target],
            'jump' => $this->jumpInput(),
        ];
        foreach ([0, $this->other] as $user) {
            wp_set_current_user($user);
            foreach ($inputs as $name => $input) {
                $this->assertWPError(wp_get_ability('helm/' . $name)->execute($input));
            }
        }
        wp_set_current_user(0);
        $this->assertWPError(wp_get_ability('helm/list-ships')->execute([]));
        $this->assertWPError(wp_get_ability('helm/list-known-edges')->execute([]));
        $this->assertNull(helm(ShipStateRepository::class)->find($this->ship->postId())->current_action_id);
    }

    public function test_validates_inputs_before_creating_an_action(): void
    {
        $this->setExpectedIncorrectUsage('WP_Ability::execute');
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
        $this->assertWPError(wp_get_ability('helm/jump')->execute(array_replace($this->jumpInput(), ['route' => []])));
        $this->assertNull(helm(ShipStateRepository::class)->find($this->ship->postId())->current_action_id);
    }

    public function test_scan_uses_real_action_factory_and_public_serialization(): void
    {
        $this->setExpectedIncorrectUsage('WP_Ability::execute');
        $ability = wp_get_ability('helm/scan-route');
        $input = ['ship_id' => $this->ship->postId(), 'target_node_id' => $this->target];
        $action = $ability->execute($input);
        $this->assertIsArray($action);
        $this->assertSame('pending', $action['status']);
        $this->assertNotNull($action['deferred_until']);
        $this->assertSame(1, $action['result']['cycle']['index']);
        $this->assertArrayNotHasKey('runtime_state', $action);
        $stored = helm(ActionRepository::class)->find($action['id']);
        $this->assertNotEmpty($stored->runtime_state);
        $this->assertSame($action['id'], helm(ShipStateRepository::class)->find($this->ship->postId())->current_action_id);
        $this->assertWPError($ability->execute($input));
        $read = wp_get_ability('helm/get-action');
        $this->assertSame($action, $read->execute(['action_id' => $action['id']]));
        wp_set_current_user($this->other);
        $this->assertWPError($read->execute(['action_id' => $action['id']]));
        wp_set_current_user(0);
        $this->assertWPError($read->execute(['action_id' => $action['id']]));
    }

    public function test_jump_is_scheduled_and_requires_discovered_edges(): void
    {
        $ability = wp_get_ability('helm/jump');
        $invalid = $this->jumpInput();
        $thirdStar = $this->tester->haveStar(['id' => 'ABILITY_OTHER', 'distanceLy' => 2.0]);
        $third = $this->tester->getNodeForStar($thirdStar)->id;
        $unknown = helm(EdgeRepository::class)->create($this->origin, $third, 2.0);
        $invalid['target_node_id'] = $third;
        $invalid['route'] = [$unknown->id];
        // An edge can exist globally without being discovered by this player.
        helm(UserEdgeRepository::class)->upsert($this->other, $unknown->id);
        $this->assertWPError($ability->execute($invalid));
        $action = $ability->execute($this->jumpInput());
        $this->assertIsArray($action);
        $this->assertSame('jump', $action['type']);
        $this->assertNotNull($action['deferred_until']);
        $this->assertSame($this->origin, helm(ShipStateRepository::class)->find($this->ship->postId())->node_id);
    }

    public function test_rest_ability_execution_uses_same_permissions_and_schema(): void
    {
        $request = new \WP_REST_Request('GET', '/wp-abilities/v1/abilities/helm/inspect-ship/run');
        $request->set_param('input', ['ship_id' => $this->ship->postId()]);
        $response = rest_do_request($request);
        $this->assertSame(200, $response->get_status());
        $this->assertSame($this->ship->postId(), $response->get_data()['ship_id']);
        wp_set_current_user($this->other);
        $this->assertSame(403, rest_do_request($request)->get_status());
    }

    public function test_rest_scan_submission_requires_post_and_returns_a_scheduled_action(): void
    {
        $route = '/wp-abilities/v1/abilities/helm/scan-route/run';
        $input = ['ship_id' => $this->ship->postId(), 'target_node_id' => $this->target];
        $read = new \WP_REST_Request('GET', $route);
        $read->set_param('input', $input);
        $this->assertGreaterThanOrEqual(400, rest_do_request($read)->get_status());
        $this->assertNull(helm(ShipStateRepository::class)->find($this->ship->postId())->current_action_id);

        $write = new \WP_REST_Request('POST', $route);
        $write->set_header('Content-Type', 'application/json');
        $write->set_body(wp_json_encode(['input' => $input]));
        $response = rest_do_request($write);
        $this->assertSame(200, $response->get_status());
        $this->assertSame('pending', $response->get_data()['status']);
        $this->assertNotNull($response->get_data()['deferred_until']);
        $this->assertArrayNotHasKey('runtime_state', $response->get_data());
    }

    public function test_handles_integer_strings_accepted_by_wordpress_schema_validation(): void
    {
        $ship = wp_get_ability('helm/inspect-ship')->execute(['ship_id' => (string) $this->ship->postId()]);
        $this->assertIsArray($ship);
        $this->assertSame($this->ship->postId(), $ship['ship_id']);
        $action = wp_get_ability('helm/scan-route')->execute([
            'ship_id' => (string) $this->ship->postId(),
            'target_node_id' => (string) $this->target,
        ]);
        $this->assertIsArray($action);
        $this->assertSame($this->target, $action['params']['target_node_id']);
    }

    /** @return array<string, mixed> */
    private function jumpInput(): array
    {
        return [
            'ship_id' => $this->ship->postId(), 'from_node_id' => $this->origin,
            'target_node_id' => $this->target, 'route' => [$this->edge],
        ];
    }
}
