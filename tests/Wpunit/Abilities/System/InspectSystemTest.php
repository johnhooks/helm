<?php

declare(strict_types=1);

namespace Tests\Wpunit\Abilities\System;

use Helm\Core\ErrorCode;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;
use Helm\Celestials\CelestialRepository;
use Helm\Celestials\CelestialType;
use Helm\Navigation\Contracts\NodeRepository;
use WP_REST_Request;

/**
 * @covers \Helm\Abilities\System\InspectSystem
 * @property WpunitTester $tester
 */
class InspectSystemTest extends WPTestCase
{
    public function set_up(): void
    {
        parent::set_up();
        wp_set_current_user(self::factory()->user->create(['role' => 'subscriber']));
    }

    public function test_returns_all_published_stars_without_route_or_player_state(): void
    {
        $a = $this->tester->haveStar(['id' => 'ABILITY_SYSTEM_A', 'distanceLy' => 5.0, 'spectralType' => 'G2V']);
        $b = $this->tester->haveStar(['id' => 'ABILITY_SYSTEM_B', 'distanceLy' => 5.0]);
        $hidden = $this->tester->haveStar(['id' => 'ABILITY_SYSTEM_HIDDEN', 'distanceLy' => 5.0]);
        wp_update_post(['ID' => $hidden->postId(), 'post_status' => 'draft']);
        $node = $this->tester->getNodeForStar($a);
        $links = helm(CelestialRepository::class);
        $links->link($node->id, CelestialType::Star, $b->postId());
        $links->link($node->id, CelestialType::Star, $hidden->postId());
        $result = wp_get_ability('helm/inspect-system')->execute(['node_id' => (string) $node->id]);
        $this->assertSame(['node_id', 'stars'], array_keys($result));
        $this->assertSame(['ABILITY_SYSTEM_A', 'ABILITY_SYSTEM_B'], array_column($result['stars'], 'catalog_id'));
        $this->assertSame(5.0, $result['stars'][0]['distance_from_sol_ly']);
        $this->assertSame('G2V', $result['stars'][0]['spectral_type']);
        $this->assertNull($result['stars'][0]['temperature_k']);
        $request = new WP_REST_Request('GET', '/wp-abilities/v1/abilities/helm/inspect-system/run');
        $request->set_param('input', ['node_id' => $node->id]);
        $this->assertSame($result, rest_do_request($request)->get_data());
    }

    public function test_rejects_missing_nodes_waypoints_invalid_input_and_anonymous_access(): void
    {
        $ability = wp_get_ability('helm/inspect-system');
        $waypoint = helm(NodeRepository::class)->create(100, 200, 300);
        foreach ([999999999, $waypoint->id] as $id) {
            $error = $ability->execute(['node_id' => $id]);
            $this->assertWPError($error);
            $this->assertSame(ErrorCode::SystemNotFound->code(), $error->get_error_code());
            $this->assertSame(404, $error->get_error_data()['status']);
        }
        $this->assertWPError($ability->execute([]));
        $this->assertWPError($ability->execute(['node_id' => -1]));
        wp_set_current_user(0);
        $this->assertWPError($ability->execute(['node_id' => $waypoint->id]));
    }
}
