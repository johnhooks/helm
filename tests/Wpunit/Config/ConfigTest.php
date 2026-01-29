<?php

declare(strict_types=1);

namespace Tests\Wpunit\Config;

use Helm\Config\Config;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\Config\Config
 */
class ConfigTest extends WPTestCase
{
    private Config $config;

    public function _before(): void
    {
        parent::_before();
        $this->config = helm(Config::class);
        $this->config->reset();
    }

    public function test_default_stars_seeded_is_false(): void
    {
        $this->assertFalse($this->config->isStarsSeeded());
    }

    public function test_default_algorithm_version_is_one(): void
    {
        $this->assertSame(1, $this->config->algorithmVersion());
    }

    public function test_can_mark_stars_seeded(): void
    {
        $this->config->markStarsSeeded();

        $this->assertTrue($this->config->isStarsSeeded());
    }

    public function test_can_set_algorithm_version(): void
    {
        $this->config->setAlgorithmVersion(2);

        $this->assertSame(2, $this->config->algorithmVersion());
    }

    public function test_get_returns_default_for_unknown_key(): void
    {
        $this->assertNull($this->config->get('unknown_key'));
        $this->assertSame('default', $this->config->get('unknown_key', 'default'));
    }

    public function test_can_set_and_get_arbitrary_values(): void
    {
        $this->config->set('custom_setting', 'custom_value');

        $this->assertSame('custom_value', $this->config->get('custom_setting'));
    }

    public function test_all_returns_all_config_values(): void
    {
        $this->config->set('test_key', 'test_value');

        $all = $this->config->all();

        $this->assertIsArray($all);
        $this->assertArrayHasKey('stars_seeded', $all);
        $this->assertArrayHasKey('algorithm_version', $all);
        $this->assertArrayHasKey('test_key', $all);
    }

    public function test_config_persists_across_instances(): void
    {
        $this->config->markStarsSeeded();
        $this->config->set('persistent_key', 'persistent_value');

        // Create fresh instance (simulates new request)
        $freshConfig = new Config();

        $this->assertTrue($freshConfig->isStarsSeeded());
        $this->assertSame('persistent_value', $freshConfig->get('persistent_key'));
    }

    public function test_reset_clears_all_config(): void
    {
        $this->config->markStarsSeeded();
        $this->config->set('test_key', 'test_value');

        $this->config->reset();

        $this->assertFalse($this->config->isStarsSeeded());
        $this->assertNull($this->config->get('test_key'));
    }

    public function test_reload_refreshes_from_database(): void
    {
        $this->config->markStarsSeeded();

        // Directly update the option (simulating external change)
        update_option('helm_config', ['stars_seeded' => false, 'algorithm_version' => 5]);

        // Still cached
        $this->assertTrue($this->config->isStarsSeeded());

        // Reload from database
        $this->config->reload();

        $this->assertFalse($this->config->isStarsSeeded());
        $this->assertSame(5, $this->config->algorithmVersion());
    }
}
