<?php

declare(strict_types=1);

namespace Tests\Wpunit\Rest;

use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\Ships\ShipPost;
use lucatume\WPBrowser\TestCase\WPRestApiTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Rest\ShipController
 *
 * @property WpunitTester $tester
 */
class ShipControllerTest extends WPRestApiTestCase
{
    private int $ownerId;
    private int $otherId;

    public function set_up(): void
    {
        parent::set_up();

        $this->tester->haveOrigin();

        $this->ownerId = self::factory()->user->create(['role' => 'subscriber']);
        $this->otherId = self::factory()->user->create(['role' => 'subscriber']);
    }

    private function createShip(array $overrides = []): ShipPost
    {
        return $this->tester->haveShip(array_merge([
            'ownerId' => $this->ownerId,
        ], $overrides));
    }

    private function getShip(int $shipId): \WP_REST_Response
    {
        $request = new \WP_REST_Request('GET', "/helm/v1/ships/{$shipId}");
        return rest_do_request($request);
    }

    private function getCargo(int $shipId): \WP_REST_Response
    {
        $request = new \WP_REST_Request('GET', "/helm/v1/ships/{$shipId}/cargo");
        return rest_do_request($request);
    }

    public function test_register_routes(): void
    {
        $routes = rest_get_server()->get_routes();

        $this->assertArrayHasKey('/helm/v1/ships/(?P<id>\\d+)', $routes);
        $this->assertArrayHasKey('/helm/v1/ships/(?P<id>\\d+)/cargo', $routes);
    }

    public function test_requires_authentication(): void
    {
        $ship = $this->createShip();

        wp_set_current_user(0);
        $response = $this->getShip($ship->postId());

        $this->assertErrorResponse('rest_not_logged_in', $response, 401);
    }

    public function test_rejects_non_owner(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->otherId);
        $response = $this->getShip($ship->postId());

        $this->assertErrorResponse('rest_forbidden', $response, 403);
    }

    public function test_returns_404_for_missing_ship(): void
    {
        wp_set_current_user($this->ownerId);
        $response = $this->getShip(999999);

        $this->assertErrorResponse('helm.ship.not_found', $response, 404);
    }

    public function test_returns_state_directly(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->getShip($ship->postId());

        $this->assertSame(200, $response->get_status());

        $data = $response->get_data();

        $expectedKeys = [
            'id',
            'node_id',
            'power_full_at',
            'shields_full_at',
            'hull_integrity',
            'power_mode',
            'cargo',
            'current_action_id',
        ];

        foreach ($expectedKeys as $key) {
            $this->assertArrayHasKey($key, $data, "Missing key: {$key}");
        }
    }

    public function test_hull_integrity_defaults_to_100(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->getShip($ship->postId());

        $data = $response->get_data();
        $this->assertSame(100.0, $data['hull_integrity']);
    }

    public function test_cargo_defaults_to_empty(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->getShip($ship->postId());

        $data = $response->get_data();
        $this->assertSame([], $data['cargo']);
    }

    public function test_cargo_endpoint_returns_empty_array(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->getCargo($ship->postId());

        $this->assertSame(200, $response->get_status());
        $this->assertSame([], $response->get_data());
    }

    public function test_cargo_endpoint_returns_resources(): void
    {
        $this->tester->haveProduct(['slug' => 'ore', 'type' => 'resource', 'label' => 'Ore']);
        $this->tester->haveProduct(['slug' => 'fuel', 'type' => 'resource', 'label' => 'Fuel']);
        $ship = $this->createShip();

        // Add cargo via the Ship object
        $shipFactory = helm(\Helm\ShipLink\ShipFactory::class);
        $shipObj = $shipFactory->build($ship->postId());
        $shipObj->cargo()->add('ore', 100);
        $shipObj->cargo()->add('fuel', 50);

        wp_set_current_user($this->ownerId);
        $response = $this->getCargo($ship->postId());

        $this->assertSame(200, $response->get_status());
        $data = $response->get_data();
        $this->assertSame(100, $data['ore']);
        $this->assertSame(50, $data['fuel']);
    }

    public function test_response_has_self_link(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->getShip($ship->postId());

        $links = $response->get_links();

        $this->assertArrayHasKey('self', $links);
        $this->assertStringEndsWith('/helm/v1/ships/' . $ship->postId(), $links['self'][0]['href']);
    }

    public function test_response_has_embeddable_systems_link(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->getShip($ship->postId());

        $links = $response->get_links();

        $this->assertArrayHasKey('helm:systems', $links);
        $this->assertStringEndsWith('/helm/v1/ships/' . $ship->postId() . '/systems', $links['helm:systems'][0]['href']);
        $this->assertTrue($links['helm:systems'][0]['attributes']['embeddable'] ?? false);
    }

    public function test_cargo_endpoint_requires_authentication(): void
    {
        $ship = $this->createShip();

        wp_set_current_user(0);
        $response = $this->getCargo($ship->postId());

        $this->assertErrorResponse('rest_not_logged_in', $response, 401);
    }

    public function test_cargo_endpoint_rejects_non_owner(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->otherId);
        $response = $this->getCargo($ship->postId());

        $this->assertErrorResponse('rest_forbidden', $response, 403);
    }

    // ---- PATCH /ships/{id} ----

    private function patchShip(int $shipId, array $body): \WP_REST_Response
    {
        $request = new \WP_REST_Request('PATCH', "/helm/v1/ships/{$shipId}");
        $request->set_header('Content-Type', 'application/json');
        $request->set_body(wp_json_encode($body));

        return rest_do_request($request);
    }

    public function test_patch_updates_power_mode(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->patchShip($ship->postId(), ['power_mode' => 'overdrive']);

        $this->assertSame(200, $response->get_status());

        $data = $response->get_data();
        $this->assertSame('overdrive', $data['power_mode']);

        // Verify it persisted
        $state = helm(ShipStateRepository::class)->find($ship->postId());
        $this->assertSame('overdrive', $state->power_mode->slug());
    }

    public function test_patch_rejects_invalid_power_mode(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->patchShip($ship->postId(), ['power_mode' => 'warp']);

        $this->assertErrorResponse('rest_invalid_param', $response, 400);
    }

    public function test_patch_rejects_unknown_property(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->patchShip($ship->postId(), ['warp_factor' => 9]);

        $this->assertErrorResponse('rest_invalid_param', $response, 400);
    }

    public function test_patch_rejects_empty_body(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->patchShip($ship->postId(), []);

        $this->assertErrorResponse('rest_missing_callback_param', $response, 400);
    }

    public function test_patch_requires_authentication(): void
    {
        $ship = $this->createShip();

        wp_set_current_user(0);
        $response = $this->patchShip($ship->postId(), ['power_mode' => 'normal']);

        $this->assertErrorResponse('rest_not_logged_in', $response, 401);
    }

    public function test_patch_rejects_non_owner(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->otherId);
        $response = $this->patchShip($ship->postId(), ['power_mode' => 'normal']);

        $this->assertErrorResponse('rest_forbidden', $response, 403);
    }

    public function test_get_returns_default_power_mode(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->getShip($ship->postId());

        $data = $response->get_data();
        $this->assertSame('normal', $data['power_mode']);
    }
}
