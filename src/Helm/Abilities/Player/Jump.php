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

final class Jump
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

        wp_register_ability('helm/jump', [
            'label' => __('Submit a jump', 'helm'),
            'description' => __('Queue a real jump along an explicit route of discovered edge IDs, in travel order, from from_node_id to target_node_id. Normal validation, resource costs, and scheduling apply. This is not a teleport. Returns an action immediately. Do not blindly retry after a transport timeout; inspect the ship\'s current action first.', 'helm'),
            'category' => 'helm',
            'input_schema' => [
                'type' => 'object',
                'properties' => $target + ['from_node_id' => $id, 'route' => ['type' => 'array', 'items' => $id, 'minItems' => 1, 'maxItems' => 500]],
                'required' => ['ship_id', 'target_node_id', 'from_node_id', 'route'],
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
        return $this->submission->submit((int) $input['ship_id'], ActionType::Jump, [
            'from_node_id' => (int) $input['from_node_id'],
            'target_node_id' => (int) $input['target_node_id'],
            'route' => $input['route'],
        ]);
    }
}
