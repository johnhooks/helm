<?php

declare(strict_types=1);

namespace Tests\Wpunit\Simulation;

use DateTimeImmutable;
use Helm\Products\Contracts\ProductRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\Helper\FixtureLoader;
use Tests\Support\Helper\SystemBuilder;

/**
 * Contract tests driven by shared JSON fixtures.
 *
 * Each fixture case specifies state + loadout + expected values.
 * The same fixtures run in TypeScript (holodeck) to verify parity.
 *
 * @covers \Helm\ShipLink\System\Power
 * @covers \Helm\ShipLink\System\Shields
 * @covers \Helm\ShipLink\System\Propulsion
 * @covers \Helm\ShipLink\System\Sensors
 */
class ContractTest extends WPTestCase
{
    private SystemBuilder $builder;

    public function set_up(): void
    {
        parent::set_up();

        $provider = new \Helm\Simulation\Provider(helm()->getContainer());
        $provider->register();
        $provider->boot();

        $this->builder = new SystemBuilder(helm(ProductRepository::class));
    }

    /**
     * @dataProvider powerFixtures
     */
    public function test_power(string $label, array $fixture): void
    {
        $power = $this->builder->buildPower($fixture);
        $now = self::fixtureNow($fixture);

        foreach ($fixture['expected'] as $key => $expectedValue) {
            $actual = match ($key) {
                'currentPower' => $power->getCurrentPower($now),
                'regenRate' => $power->getRegenRate(),
                'outputMultiplier' => $power->getOutputMultiplier(),
                default => $this->fail("Unknown expected key: {$key}"),
            };
            $this->assertEqualsWithDelta($expectedValue, $actual, 0.01, "{$label}: {$key}");
        }
    }

    /**
     * @dataProvider shieldFixtures
     */
    public function test_shields(string $label, array $fixture): void
    {
        $shields = $this->builder->buildShields($fixture);
        $now = self::fixtureNow($fixture);

        foreach ($fixture['expected'] as $key => $expectedValue) {
            $actual = match ($key) {
                'currentStrength' => $shields->getCurrentStrength($now),
                'regenRate' => $shields->getRegenRate(),
                default => $this->fail("Unknown expected key: {$key}"),
            };
            $this->assertEqualsWithDelta($expectedValue, $actual, 0.01, "{$label}: {$key}");
        }
    }

    /**
     * @dataProvider propulsionFixtures
     */
    public function test_propulsion(string $label, array $fixture): void
    {
        $propulsion = $this->builder->buildPropulsion($fixture);
        $distance = (float) ($fixture['distance'] ?? 0);

        foreach ($fixture['expected'] as $key => $expectedValue) {
            $actual = match ($key) {
                'jumpDuration' => $propulsion->getJumpDuration($distance),
                'coreCost' => $propulsion->calculateCoreCost($distance),
                'performanceRatio' => $propulsion->getPerformanceRatio(),
                'maxRange' => $propulsion->getMaxRange(),
                default => $this->fail("Unknown expected key: {$key}"),
            };
            $this->assertEqualsWithDelta($expectedValue, $actual, 0.01, "{$label}: {$key}");
        }
    }

    /**
     * @dataProvider sensorFixtures
     */
    public function test_sensors(string $label, array $fixture): void
    {
        $sensors = $this->builder->buildSensors($fixture);
        $distance = (float) ($fixture['distance'] ?? 0);

        foreach ($fixture['expected'] as $key => $expectedValue) {
            $actual = match ($key) {
                'range' => $sensors->getRange(),
                'scanDuration' => $sensors->getRouteScanDuration($distance),
                'scanCost' => $sensors->getRouteScanCost($distance),
                default => $this->fail("Unknown expected key: {$key}"),
            };
            $this->assertEqualsWithDelta($expectedValue, $actual, 0.01, "{$label}: {$key}");
        }
    }

    /**
     * @dataProvider combinedFixtures
     */
    public function test_combined(string $label, array $fixture): void
    {
        $state = $this->builder->buildShipState($fixture);
        $loadout = $this->builder->buildLoadout($fixture);

        $power = new \Helm\ShipLink\System\Power($state, $loadout);
        $shields = new \Helm\ShipLink\System\Shields($state, $loadout);
        $propulsion = new \Helm\ShipLink\System\Propulsion($loadout, $power);
        $sensors = new \Helm\ShipLink\System\Sensors($loadout, $power);

        $now = self::fixtureNow($fixture);
        $distance = (float) ($fixture['distance'] ?? 0);

        foreach ($fixture['expected'] as $key => $expectedValue) {
            $actual = match ($key) {
                'currentPower' => $power->getCurrentPower($now),
                'regenRate' => $power->getRegenRate(),
                'outputMultiplier' => $power->getOutputMultiplier(),
                'currentStrength' => $shields->getCurrentStrength($now),
                'jumpDuration' => $propulsion->getJumpDuration($distance),
                'coreCost' => $propulsion->calculateCoreCost($distance),
                'maxRange' => $propulsion->getMaxRange(),
                'range' => $sensors->getRange(),
                default => $this->fail("Unknown expected key: {$key}"),
            };
            $this->assertEqualsWithDelta($expectedValue, $actual, 0.01, "{$label}: {$key}");
        }
    }

    // -----------------------------------------------------------------------
    // Data providers
    // -----------------------------------------------------------------------

    public static function powerFixtures(): iterable
    {
        return self::loadFixtures('fixtures/ship-state/power.json');
    }

    public static function shieldFixtures(): iterable
    {
        return self::loadFixtures('fixtures/ship-state/shields.json');
    }

    public static function propulsionFixtures(): iterable
    {
        return self::loadFixtures('fixtures/ship-state/propulsion.json');
    }

    public static function sensorFixtures(): iterable
    {
        return self::loadFixtures('fixtures/ship-state/sensors.json');
    }

    public static function combinedFixtures(): iterable
    {
        return self::loadFixtures('fixtures/ship-state/combined.json');
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /**
     * Load fixtures and format as data provider entries.
     *
     * @return iterable<string, array{string, array}>
     */
    private static function loadFixtures(string $path): iterable
    {
        $fixtures = FixtureLoader::load($path);

        foreach ($fixtures as $fixture) {
            $label = $fixture['label'] ?? 'unnamed';
            yield $label => [$label, $fixture];
        }
    }

    private static function fixtureNow(array $fixture): DateTimeImmutable
    {
        $timestamp = $fixture['now'] ?? 0;
        $dt = DateTimeImmutable::createFromFormat('U', (string) $timestamp);

        if ($dt === false) {
            throw new \RuntimeException("Invalid now timestamp: {$timestamp}");
        }

        return $dt;
    }
}
