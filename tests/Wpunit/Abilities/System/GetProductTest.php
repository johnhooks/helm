<?php

declare(strict_types=1);

namespace Tests\Wpunit\Abilities\System;

use Helm\Core\ErrorCode;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;
use WP_REST_Request;

/**
 * @covers \Helm\Abilities\System\GetProduct
 * @property WpunitTester $tester
 */
class GetProductTest extends WPTestCase
{
    public function set_up(): void
    {
        parent::set_up();
        wp_set_current_user(self::factory()->user->create(['role' => 'subscriber']));
    }

    public function test_returns_exact_version_and_nullable_stats_over_rest(): void
    {
        $a = $this->tester->haveProduct(['slug' => 'ability-sensor', 'type' => 'sensor', 'version' => 1, 'range' => 4.5]);
        $this->tester->haveProduct(['slug' => 'ability-sensor', 'type' => 'sensor', 'version' => 2, 'range' => 9.0]);
        $input = ['product_id' => (string) $a->id];
        $result = wp_get_ability('helm/get-product')->execute($input);
        $this->assertSame(1, $result['version']);
        $this->assertSame(4.5, $result['range']);
        $this->assertNull($result['chance']);
        $this->assertArrayNotHasKey('created_at', $result);
        $request = new WP_REST_Request('GET', '/wp-abilities/v1/abilities/helm/get-product/run');
        $request->set_param('input', $input);
        $response = rest_do_request($request);
        $this->assertSame(200, $response->get_status());
        $this->assertSame($result, $response->get_data());
        wp_set_current_user(0);
        $this->assertSame(401, rest_do_request($request)->get_status());
    }

    public function test_missing_product_and_invalid_input_return_errors(): void
    {
        $ability = wp_get_ability('helm/get-product');
        $error = $ability->execute(['product_id' => 999999999]);
        $this->assertWPError($error);
        $this->assertSame(ErrorCode::ProductNotFound->code(), $error->get_error_code());
        $this->assertSame(404, $error->get_error_data()['status']);
        $this->assertSame(999999999, $error->get_error_data()['product_id']);
        $this->assertWPError($ability->execute([]));
        $this->assertWPError($ability->execute(['product_id' => -1]));
        wp_set_current_user(0);
        $this->assertWPError($ability->execute(['product_id' => 1]));
    }
}
