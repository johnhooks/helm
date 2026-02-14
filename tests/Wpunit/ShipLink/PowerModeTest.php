<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\ShipLink\Components\PowerMode;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\ShipLink\Components\PowerMode
 */
class PowerModeTest extends WPTestCase
{
    public function test_slugs_returns_all_slugs(): void
    {
        $this->assertSame(['efficiency', 'normal', 'overdrive'], PowerMode::slugs());
    }

    public function test_from_slug_returns_efficiency(): void
    {
        $this->assertSame(PowerMode::Efficiency, PowerMode::fromSlug('efficiency'));
    }

    public function test_from_slug_returns_normal(): void
    {
        $this->assertSame(PowerMode::Normal, PowerMode::fromSlug('normal'));
    }

    public function test_from_slug_returns_overdrive(): void
    {
        $this->assertSame(PowerMode::Overdrive, PowerMode::fromSlug('overdrive'));
    }

    public function test_from_slug_returns_null_for_invalid(): void
    {
        $this->assertNull(PowerMode::fromSlug('warp'));
    }

    public function test_from_slug_returns_null_for_empty(): void
    {
        $this->assertNull(PowerMode::fromSlug(''));
    }
}
