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

    public function test_response_has_embeddable_product_links(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->getSystems($ship->postId());

        $links = $response->get_links();

        // Should have self link
        $this->assertArrayHasKey('self', $links);

        // Should have ship link (embeddable)
        $this->assertArrayHasKey('ship', $links);
        $this->assertTrue($links['ship'][0]['attributes']['embeddable'] ?? false);

        // Should have product links (embeddable)
        $this->assertArrayHasKey('helm:product', $links);
        $productLinks = $links['helm:product'];
        $this->assertCount(5, $productLinks); // 5 unique products for default loadout

        // All product links should be embeddable
        foreach ($productLinks as $link) {
            $this->assertTrue($link['attributes']['embeddable'] ?? false);
        }
    }

    public function test_product_links_match_system_product_ids(): void
    {
        $ship = $this->createShip();

        wp_set_current_user($this->ownerId);
        $response = $this->getSystems($ship->postId());

        $data = $response->get_data();
        $links = $response->get_links();

        // Get product IDs from systems
        $productIds = array_unique(array_column($data, 'product_id'));

        // Get product IDs from links
        $productLinks = $links['helm:product'];
        $linkedProductIds = [];
        foreach ($productLinks as $link) {
            // Extract ID from URL like .../products/123
            preg_match('/\/products\/(\d+)$/', $link['href'], $matches);
            if (isset($matches[1])) {
                $linkedProductIds[] = (int) $matches[1];
            }
        }

        // Should match
        sort($productIds);
        sort($linkedProductIds);
        $this->assertSame($productIds, $linkedProductIds);
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
