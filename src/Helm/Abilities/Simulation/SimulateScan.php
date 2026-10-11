<?php

declare(strict_types=1);

namespace Helm\Abilities\Simulation;

use Psr\Log\LoggerInterface;
use Helm\Core\ErrorCode;
use Helm\Simulation\ScanRunner;
use InvalidArgumentException;
use WP_Error;

/** Local development tool. Never operates on player ship IDs. */
final class SimulateScan
{
    public function __construct(
        private readonly ScanRunner $runner,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function register(): void
    {
        wp_register_ability('helm/simulate-scan', [
            'label' => __('Simulate route scans', 'helm'),
            'description' => __('Run bounded, repeatable route scans using catalog equipment and isolated simulated ships. Does not alter live ships, discoveries, time, or resources. Returns per-trial outcomes, duration percentiles including partial outcomes, and first-trial chance/cost history. Local administrators only.', 'helm'),
            'category' => 'helm',
            'input_schema' => [
                'type' => 'object',
                'properties' => [
                    'distance_ly' => ['type' => 'number', 'exclusiveMinimum' => 0, 'maximum' => 30],
                    'sensor' => ['type' => 'string', 'enum' => ['dsc_mk1', 'vrs_mk1', 'acu_mk1']],
                    'nav_tier' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 5],
                    'core' => ['type' => 'string', 'enum' => ['epoch_e', 'epoch_s', 'epoch_r']],
                    'initial_power' => ['type' => 'number', 'minimum' => 0, 'maximum' => 100],
                    'jump_distance_ly' => ['type' => 'number', 'exclusiveMinimum' => 0, 'maximum' => 10],
                    'drive' => ['type' => 'string', 'enum' => ['dr_305', 'dr_505', 'dr_705']],
                    'core_life' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 10000],
                    'power_mode' => ['type' => 'string', 'enum' => ['efficiency', 'normal', 'overdrive']],
                    'intensity' => ['type' => 'string', 'enum' => ['economy', 'normal', 'fast']],
                    'seed' => ['type' => 'string', 'maxLength' => 64],
                    'trials' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 30],
                ],
                'required' => ['distance_ly'], 'additionalProperties' => false,
            ],
            'output_schema' => [
                'type' => 'object',
                'properties' => [
                    'configuration' => ['type' => 'object'],
                    'runs' => ['type' => 'array', 'items' => ['type' => 'object']],
                    'summary' => ['type' => 'object'],
                ],
                'required' => ['configuration', 'runs', 'summary'], 'additionalProperties' => false,
            ],
            'execute_callback' => [$this, 'execute'], 'permission_callback' => [$this, 'canExecute'],
            'meta' => [
                'show_in_rest' => true, 'mcp' => ['public' => true],
                'annotations' => ['readonly' => true, 'destructive' => false, 'idempotent' => true],
            ],
        ]);
    }

    public function canExecute(): bool
    {
        return wp_get_environment_type() === 'local' && current_user_can('manage_options');
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>|WP_Error
     */
    public function execute(array $input): array|WP_Error
    {
        try {
            return $this->runner->run($input);
        } catch (InvalidArgumentException $error) {
            $this->logger->warning('Ability request rejected: {reason}', [
                'event' => 'ability.simulation_invalid',
                'reason' => $error->getMessage(),
            ]);
            return ErrorCode::SimulationInvalidConfiguration->error(__('Invalid scan simulation configuration. Check the equipment, distance, and trial limits.', 'helm'));
        }
    }
}
