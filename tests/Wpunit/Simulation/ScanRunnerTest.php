<?php

declare(strict_types=1);

namespace Tests\Wpunit\Simulation;

use Helm\Lib\Date;
use Helm\Simulation\ScanRunner;
use lucatume\WPBrowser\TestCase\WPTestCase;

/** @covers \Helm\Simulation\ScanRunner */
class ScanRunnerTest extends WPTestCase
{
    public function test_detached_runs_are_repeatable_and_do_not_write_live_state(): void
    {
        $before = Date::getTestNow();
        $writes = [];
        $capture = static function (string $query) use (&$writes): string {
            if (preg_match('/^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i', $query)) {
                $writes[] = $query;
            }
            return $query;
        };
        add_filter('query', $capture);
        try {
            $runner = new ScanRunner();
            $config = ['trials' => 2, 'distance_ly' => 2.416, 'seed' => 'runner-test'];
            $first = $runner->run($config);
            $this->assertSame($first, $runner->run($config));
            $this->assertSame([], $writes);
            $this->assertEquals($before, Date::getTestNow());
            $this->assertSame('fulfilled', $first['runs'][0]['status']);
            $this->assertGreaterThan(1, $first['runs'][0]['cycles']);
            $this->assertCount($first['runs'][0]['cycles'], $first['runs'][0]['history']);
            $this->assertSame('runner-test', $first['runs'][0]['history'][0]['seed']);
            $this->assertSame(0, $first['runs'][0]['history'][0]['trial']);
            $this->assertArrayHasKey('work_after', $first['runs'][0]['history'][0]);
            $this->assertArrayNotHasKey('discovery_roll', $first['runs'][0]['history'][0]);
            $this->assertSame([], $first['runs'][1]['history']);
            $this->assertGreaterThan(0, $first['runs'][0]['core_spent']);
            $fast = $runner->run($config + ['intensity' => 'fast']);
            $this->assertEquals($first['runs'][0]['hours'] / 2, $fast['runs'][0]['hours']);
            $this->assertSame($first['runs'][0]['core_spent'] * 2, $fast['runs'][0]['core_spent']);
        } finally {
            remove_filter('query', $capture);
        }
    }
}
