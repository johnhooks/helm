<?php

declare(strict_types=1);

namespace Tests\Wpunit\Rest;

use Helm\Ships\ShipPost;
use lucatume\WPBrowser\TestCase\WPRestApiTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Rest\ShipSystemsController
 *
 * @property WpunitTester $tester
 */
class ShipSystemsControllerTest extends WPRestApiTestCase
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

    private function getSystems(int $shipId): \WP_REST_Response
    {
        $request = new \WP_REST_Request('GET', "/helm/v1/ships/{$shipId}/systems");
        return rest_do_request($request);
    }

    public function test_register_routes(): void
    {
        $routes = rest_get_server()->get_routes();

        $this->assertArrayHasKey('/helm/v1/ships/(?P<id>\\d+)/systems', $routes);
    }

    public function test_requires_authentication(): void
    {
        $ship = $this->createShip();

        wp_set_current_user(0);
        $response = $this->getSystems($ship->postId());

        $this->assertErrorResponse('rest_not_logged_in', $response, 401);
    }

    public function test_rejects_non_owner(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->otherId);
        $response = $this->getSystems($ship->postId());

        $this->assertErrorResponse('rest_forbidden', $response, 403);
    }

    public function test_returns_404_for_missing_ship(): void
    {
        wp_set_current_user($this->ownerId);
        $response = $this->getSystems(999999);

        $this->assertErrorResponse('helm.ship.not_found', $response, 404);
    }

    public function test_returns_array_of_systems(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->getSystems($ship->postId());

        $this->assertSame(200, $response->get_status());

        $data = $response->get_data();
        $this->assertIsArray($data);
        $this->assertCount(5, $data); // 5 required slots, no equipment
    }

    public function test_returns_all_required_slots(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->getSystems($ship->postId());

        $data = $response->get_data();
        $slots = array_column($data, 'slot');

        $requiredSlots = ['core', 'drive', 'sensor', 'shield', 'nav'];
        foreach ($requiredSlots as $slot) {
            $this->assertContains($slot, $slots, "Missing slot: {$slot}");
        }
    }

    public function test_system_contains_expected_fields(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->getSystems($ship->postId());

        $data = $response->get_data();
        $core = $this->findBySlot($data, 'core');

        $expectedFields = [
            'id',
            'product_id',
            'slot',
            'life',
            'usage_count',
            'condition',
        ];

        foreach ($expectedFields as $field) {
            $this->assertArrayHasKey($field, $core, "Missing field: {$field}");
        }
    }

    public function test_default_loadout_core_values(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->getSystems($ship->postId());

        $data = $response->get_data();
        $core = $this->findBySlot($data, 'core');

        $this->assertSame(750, $core['life']);
        $this->assertSame(0, $core['usage_count']);
        $this->assertEquals(1.0, $core['condition']); // assertEquals handles int/float comparison
    }

    public function test_each_system_has_embeddable_product_link(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->getSystems($ship->postId());

        $data = $response->get_data();

        foreach ($data as $system) {
            $this->assertArrayHasKey('_links', $system, "System {$system['slot']} missing _links");
            $this->assertArrayHasKey('helm:product', $system['_links'], "System {$system['slot']} missing helm:product link");

            $productLink = $system['_links']['helm:product'][0];
            $this->assertTrue($productLink['embeddable']);
            $this->assertStringContainsString('/products/' . $system['product_id'], $productLink['href']);
        }
    }

    /**
     * Find a system by slot in the response array.
     *
     * @param array<int, array<string, mixed>> $systems
     * @return array<string, mixed>|null
     */
    private function findBySlot(array $systems, string $slot): ?array
    {
        foreach ($systems as $system) {
            if ($system['slot'] === $slot) {
                return $system;
            }
        }
        return null;
    }
}
