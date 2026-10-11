<?php

declare(strict_types=1);

use Helm\Experiments\ScanModels\Model;
use Helm\Simulation\SimulationRandomSource;

require dirname(__DIR__, 2) . '/vendor/autoload.php';
require __DIR__ . '/Model.php';

$trials = (int) ($argv[1] ?? 1000);
if ($trials < 1) {
    throw new InvalidArgumentException('Trials must be positive.');
}
$output = dirname(__DIR__, 2) . '/tmp/scan-models';
if (!is_dir($output)) {
    mkdir($output, 0775, true);
}
$file = fopen($output . '/summary.csv', 'w');
$fields = ['model', 'scenario', 'capability', 'mode', 'trials', 'mean_hours', 'p10_hours', 'p50_hours', 'p90_hours', 'p99_hours', 'mean_core', 'over_24h_pct', 'over_631_core_pct', 'first_cycle_pct', 'censored'];
fputcsv($file, $fields, ',', '"', '');
$rows = [];
foreach (['fixed', 'rising', 'work'] as $kind) {
    foreach (['near' => [[0.5], 1.0], 'lacaille' => [[2.4160570812793307], 1.0], 'long' => [[6.5], 1.3], 'long_three_legs' => [[6.5 / 3, 6.5 / 3, 6.5 / 3], 1.3]] as $scenario => [$legs, $difficulty]) {
        foreach (['basic' => 0.7, 'reference' => 1.0, 'advanced' => 1.5] as $equipment => $capability) {
            $samples = [];
            $censored = 0;
            for ($trial = 0; $trial < $trials; $trial++) {
                // Common seeded rolls across models/equipment; modes reuse identical trials.
                $cycles = 0;
                foreach ($legs as $leg => $distance) {
                    $model = new Model($kind, Model::expectedCycles($distance, $difficulty, $capability), new SimulationRandomSource("scan-study:$scenario:$trial:$leg"));
                    while (!$model->complete && $cycles < 10000) {
                        $model->tick();
                        $cycles++;
                    }
                    if (!$model->complete) {
                        $censored++;
                        break;
                    }
                }
                $samples[] = $cycles;
            }
            sort($samples);
            foreach (['economy' => [600, 1], 'normal' => [300, 2], 'fast' => [150, 4]] as $scanMode => [$seconds, $cost]) {
                $quantile = static fn (float $q): float => $samples[max(0, (int) ceil($q * $trials) - 1)] * $seconds / 3600;
                $percentage = static fn (callable $predicate): float => 100 * count(array_filter($samples, $predicate)) / $trials;
                $row = [$kind, $scenario, $equipment, $scanMode, $trials,
                    array_sum($samples) / $trials * $seconds / 3600,
                    $quantile(0.1), $quantile(0.5), $quantile(0.9), $quantile(0.99),
                    array_sum($samples) / $trials * $cost,
                    $percentage(static fn (int $n): bool => $n * $seconds > 86400),
                    $percentage(static fn (int $n): bool => $n * $cost > 631),
                    $percentage(static fn (int $n): bool => $n === 1), $censored];
                $row = array_map(static fn ($value) => is_float($value) ? round($value, 3) : $value, $row);
                fputcsv($file, $row, ',', '"', '');
                $rows[] = array_combine($fields, $row);
            }
        }
    }
}
fclose($file);
file_put_contents($output . '/summary.json', json_encode($rows, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR) . "\n");
// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI report path, not HTML.
echo 'Wrote ' . count($rows) . " configurations to $output\n";
