<?php

declare(strict_types=1);

namespace Tests\Wpunit\Abilities\Simulation;

use Helm\Abilities\Simulation\SimulateScan;
use Helm\Simulation\ScanRunner;
use Psr\Log\NullLogger;
use InvalidArgumentException;
use lucatume\WPBrowser\TestCase\WPTestCase;

/** @covers \Helm\Abilities\Simulation\SimulateScan */
class SimulateScanTest extends WPTestCase
{
    public function test_registration_and_permissions(): void
    {
        $ability = wp_get_ability('helm/simulate-scan');
        $this->assertNotNull($ability);
        $this->assertTrue($ability->get_meta_item('annotations')['readonly']);
        $service = new SimulateScan(new ScanRunner(), new NullLogger());
        wp_set_current_user(0);
        $this->assertFalse($service->canExecute());
        wp_set_current_user(self::factory()->user->create(['role' => 'subscriber']));
        $this->assertFalse($service->canExecute());
        wp_set_current_user(self::factory()->user->create(['role' => 'administrator']));
        $this->assertSame(wp_get_environment_type() === 'local', $service->canExecute());
    }

    public function test_invalid_parameters_are_bounded_before_simulation(): void
    {
        $service = new SimulateScan(new ScanRunner(), new NullLogger());
        $this->assertWPError($service->execute(['distance_ly' => 2, 'trials' => 31]));
        $this->assertWPError($service->execute(['distance_ly' => -1]));
        $this->assertWPError($service->execute(['sensor' => 'unknown']));
        $this->expectException(InvalidArgumentException::class);
        (new ScanRunner())->run(['trials' => 0]);
    }
}
