<?php

declare(strict_types=1);

namespace Tests\Wpunit\Abilities;

use lucatume\WPBrowser\TestCase\WPTestCase;

/** @covers \Helm\Abilities\Provider */
class ProviderTest extends WPTestCase
{
    public function test_registers_discoverable_abilities_with_correct_annotations(): void
    {
        foreach (['plan-route', 'list-ships', 'inspect-ship', 'list-scan-targets', 'list-known-edges', 'get-action', 'cancel-action', 'scan-route', 'jump', 'inspect-system', 'list-products', 'get-product'] as $name) {
            $ability = wp_get_ability('helm/' . $name);
            $this->assertNotNull($ability);
            $this->assertSame('helm', $ability->get_category());
            $this->assertTrue($ability->get_meta_item('show_in_rest'));
            $this->assertTrue($ability->get_meta_item('mcp')['public']);
            $readonly = ! in_array($name, ['scan-route', 'jump', 'cancel-action'], true);
            $this->assertSame($readonly, $ability->get_meta_item('annotations')['readonly']);
            $this->assertSame($readonly || $name === 'cancel-action', $ability->get_meta_item('annotations')['idempotent']);
        }
    }
}
