<?php

declare(strict_types=1);

namespace Tests\Wpunit\Abilities\System;

use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Abilities\System\ListProducts
 * @property WpunitTester $tester
 */
class ListProductsTest extends WPTestCase
{
    public function set_up(): void
    {
        parent::set_up();
        wp_set_current_user(self::factory()->user->create(['role' => 'subscriber']));
    }

    public function test_filters_and_paginates_all_versions(): void
    {
        $ability = wp_get_ability('helm/list-products');
        $baseline = $ability->execute(['type' => 'nav'])['total'];
        $allBaseline = $ability->execute([])['total'];
        $a = $this->tester->haveProduct(['type' => 'nav', 'slug' => 'ability-nav', 'version' => 1]);
        $b = $this->tester->haveProduct(['type' => 'nav', 'slug' => 'ability-nav', 'version' => 2]);
        $this->tester->haveProduct(['type' => 'sensor']);
        $ability = wp_get_ability('helm/list-products');
        $first = $ability->execute(['type' => 'nav', 'per_page' => 1, 'page' => $baseline + 1]);
        $this->assertSame($baseline + 2, $first['total']);
        $this->assertSame($a->id, $first['products'][0]['product_id']);
        $this->assertTrue($first['has_more']);
        $second = $ability->execute(['type' => 'nav', 'per_page' => 1, 'page' => $baseline + 2]);
        $this->assertSame($b->id, $second['products'][0]['product_id']);
        $this->assertFalse($second['has_more']);
        $this->assertSame([], $ability->execute(['type' => 'nav', 'page' => $baseline + 10])['products']);
        $this->assertSame($allBaseline + 3, $ability->execute([])['total']);
    }

    public function test_rejects_invalid_filters_pagination_and_anonymous_access(): void
    {
        $ability = wp_get_ability('helm/list-products');
        foreach ([['type' => 'invalid'], ['page' => 0], ['per_page' => 101], ['owner' => 1]] as $input) {
            $this->assertWPError($ability->execute($input));
        }
        wp_set_current_user(0);
        $this->assertWPError($ability->execute([]));
    }
}
