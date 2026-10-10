<?php

declare(strict_types=1);

namespace Helm\Abilities\Player;

use Helm\Core\ErrorCode;
use Helm\Abilities\Support\ActionSubmission;
use Helm\Abilities\Support\Schemas;
use Helm\Rest\ShipActionsController;
use Helm\ShipLink\ActionType;
use WP_Error;
use WP_REST_Request;

final class ScanRoute
{
    public function __construct(
        private readonly ActionSubmission $submission,
        private readonly ShipActionsController $permissions,
    ) {
    }

    public function register(): void
    {
        $id = ['type' => 'integer', 'minimum' => 1];
        $ship = ['ship_id' => $id];
        $target = $ship + ['target_node_id' => $id];
        $action = Schemas::action();

        wp_register_ability('helm/scan-route', [
            'label' => __('Submit a route scan', 'helm'),
            'description' => __('Queue a real route scan from your ship\'s current position. Normal range, busy-ship, timing, and resource rules apply. Returns an action immediately; use get-action after deferred_until to check progress. Submission is not idempotent: do not blindly retry after a transport timeout; inspect the ship\'s current action first.', 'helm'),
            'category' => 'helm',
            'input_schema' => [
                'type' => 'object',
                'properties' => $target,
                'required' => ['ship_id', 'target_node_id'],
                'additionalProperties' => false,
            ],
            'output_schema' => $action,
            'execute_callback' => [$this, 'execute'],
            'permission_callback' => [$this, 'canExecute'],
            'meta' => [
                'show_in_rest' => true,
                'public' => true,
                'mcp' => ['public' => true],
                'annotations' => [
                    'readonly' => false,
                    'destructive' => true,
                    'idempotent' => false,
                ],
            ],
        ]);
    }

    /** @param array<string, mixed> $input */
    public function canExecute(array $input): bool|WP_Error
    {
        if (! isset($input['ship_id'])) {
            return ErrorCode::InputShipIdRequired->error(__('ship_id is required. Use helm/list-ships to find your ship ID.', 'helm'), ['status' => ErrorCode::InputShipIdRequired->httpStatus()]);
        }
        /** @var WP_REST_Request<array<string, mixed>> $request */
        $request = new WP_REST_Request();
        $request->set_param('id', $input['ship_id']);
        return $this->permissions->permissions($request);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>|WP_Error
     */
    public function execute(array $input): array|WP_Error
    {
        return $this->submission->submit((int) $input['ship_id'], ActionType::ScanRoute, ['target_node_id' => (int) $input['target_node_id']]);
    }
}
