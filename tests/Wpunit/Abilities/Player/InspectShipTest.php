<?php

declare(strict_types=1);

namespace Tests\Wpunit\Abilities\Player;

use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\Ships\ShipPost;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;
use WP_REST_Request;

/**
 * @covers \Helm\Abilities\Player\InspectShip
 * @property WpunitTester $tester
 */
class InspectShipTest extends WPTestCase
{
    private int $owner;
    private int $other;
    private int $origin;
    private ShipPost $ship;

    public function set_up(): void
    {
        parent::set_up();
        $this->tester->haveOrigin();
        $this->owner = self::factory()->user->create(['role' => 'subscriber']);
        $this->other = self::factory()->user->create(['role' => 'subscriber']);
        $from = $this->tester->haveStar(['id' => 'ABILITY_FROM', 'distanceLy' => 0.0]);
        $this->origin = $this->tester->getNodeForStar($from)->id;
        $this->ship = $this->tester->haveShip([
            'ownerId' => $this->owner, 'node_id' => $this->origin, 'core_life' => 1000.0,
        ]);
        wp_set_current_user($this->owner);
    }

    public function test_inspects_effective_ship_readings(): void
    {
        $input = ['ship_id' => $this->ship->postId()];
        $result = wp_get_ability('helm/inspect-ship')->execute($input);
        $this->assertIsArray($result);
        $this->assertSame($this->origin, $result['state']['node_id']);
        $this->assertGreaterThan(0, $result['sensor_range_ly']);
        $this->assertGreaterThan(0, $result['jump_range_ly']);
    }

    public function test_rest_ability_execution_uses_same_permissions_and_schema(): void
    {
        $request = new WP_REST_Request('GET', '/wp-abilities/v1/abilities/helm/inspect-ship/run');
        $request->set_param('input', ['ship_id' => $this->ship->postId()]);
        $response = rest_do_request($request);
        $this->assertSame(200, $response->get_status());
        $this->assertSame($this->ship->postId(), $response->get_data()['ship_id']);
        wp_set_current_user($this->other);
        $this->assertSame(403, rest_do_request($request)->get_status());
    }

    public function test_handles_integer_strings_accepted_by_wordpress_schema_validation(): void
    {
        $ship = wp_get_ability('helm/inspect-ship')->execute(['ship_id' => (string) $this->ship->postId()]);
        $this->assertIsArray($ship);
        $this->assertSame($this->ship->postId(), $ship['ship_id']);
    }

    public function test_rejects_unauthorized_calls_without_side_effects(): void
    {
        $this->setExpectedIncorrectUsage('WP_Ability::execute');
        foreach ([0, $this->other] as $user) {
            wp_set_current_user($user);
            $this->assertWPError(wp_get_ability('helm/inspect-ship')->execute(['ship_id' => $this->ship->postId()]));
        }
        $this->assertNull(helm(ShipStateRepository::class)->find($this->ship->postId())->current_action_id);
    }
}
