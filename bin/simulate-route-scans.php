<?php

use Helm\Simulation\ScanRunner;

// Run with: wp eval-file bin/simulate-route-scans.php
// Each scenario uses detached repositories; no live actions or ships are changed.
$runner = new ScanRunner();
$results = [];
foreach (['dsc_mk1', 'vrs_mk1', 'acu_mk1'] as $sensor) {
    foreach ([1, 3, 5] as $nav) {
        foreach ([0.5, 2.416, 6.5] as $distance) {
            foreach (['normal', 'fast'] as $intensity) {
                $result = $runner->run([
                    'sensor' => $sensor, 'nav_tier' => $nav, 'distance_ly' => $distance,
                    'intensity' => $intensity, 'trials' => 20, 'seed' => 'balance-v2',
                ]);
                foreach ($result['runs'] as &$run) {
                    unset($run['history']);
                }
                unset($run);
                $results[] = $result;
            }
        }
    }
}
foreach (['epoch_e', 'epoch_s', 'epoch_r'] as $core) {
    foreach (['efficiency', 'normal', 'overdrive'] as $powerMode) {
        $results[] = $runner->run(['core' => $core, 'power_mode' => $powerMode, 'distance_ly' => 2.416, 'trials' => 10, 'seed' => 'balance-v2']);
    }
}
foreach (['easy-corridor', 'difficult-corridor', 'long-chain'] as $seed) {
    $results[] = $runner->run(['sensor' => 'dsc_mk1', 'nav_tier' => 3, 'power_mode' => 'overdrive', 'distance_ly' => 8.5, 'trials' => 20, 'seed' => $seed]);
}
$results[] = $runner->run(['core_life' => 20, 'distance_ly' => 2.416, 'trials' => 10]);
$results[] = $runner->run(['intensity' => 'economy', 'distance_ly' => 2.416, 'trials' => 10]);
// Stress combinations measure the reserve left for a 2.416 ly jump after scanning.
foreach (['epoch_e', 'epoch_s', 'epoch_r'] as $core) {
    foreach (['economy', 'normal', 'fast'] as $intensity) {
        foreach ([25, 100] as $initialPower) {
            foreach (['dr_305', 'dr_505', 'dr_705'] as $drive) {
                $results[] = $runner->run([
                    'core' => $core, 'drive' => $drive, 'intensity' => $intensity,
                    'initial_power' => $initialPower, 'distance_ly' => 2.416,
                    'jump_distance_ly' => 2.416, 'trials' => 20, 'seed' => 'power-reserve',
                ]);
            }
        }
    }
}
// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Machine-readable WP-CLI output.
echo json_encode($results, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR) . "\n";
