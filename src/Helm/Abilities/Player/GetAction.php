<?php

declare(strict_types=1);

namespace Helm\Abilities\Player;

use Helm\Core\ErrorCode;
use Helm\Abilities\Support\Schemas;
use Helm\Rest\ShipActionsController;
use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\Resources\ActionResource;
use WP_Error;
use WP_REST_Request;

final class GetAction
{
    public function __construct(
        private readonly ActionRepository $actionRepository,
        private readonly ShipActionsController $permissions,
    ) {
    }

    public function register(): void
    {
        $id = ['type' => 'integer', 'minimum' => 1];
        $action = Schemas::action();

        wp_register_ability('helm/get-action', [
            'label' => __('Inspect my action', 'helm'),
            'description' => __('Read an action belonging to one of your ships, including status, public progress, and the next scheduled checkpoint. This read does not process or accelerate the action. Private scan rolls and runtime history are never returned.', 'helm'),
            'category' => 'helm',
            'input_schema' => [
                'type' => 'object',
                'properties' => ['action_id' => $id],
                'required' => ['action_id'],
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
                    'readonly' => true,
                    'destructive' => false,
                    'idempotent' => true,
                ],
            ],
        ]);
    }

    /** @param array<string, mixed> $input */
    public function canExecute(array $input): bool|WP_Error
    {
        if (! isset($input['action_id'])) {
            return ErrorCode::InputActionIdRequired->error('action_id is required. Inspect your ship to find its current_action_id.', ['status' => ErrorCode::InputActionIdRequired->httpStatus()]);
        }
        /** @var WP_REST_Request<array<string, mixed>> $request */
        $request = new WP_REST_Request();
        $request->set_param('actionId', $input['action_id']);
        return $this->permissions->actionPermissions($request);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>|WP_Error
     */
    public function execute(array $input): array|WP_Error
    {
        $action = $this->actionRepository->find((int) $input['action_id']);
        if ($action === null) {
            return ErrorCode::ActionNotFound->error(__('Action not found.', 'helm'), ['status' => ErrorCode::ActionNotFound->httpStatus()]);
        }
        return (new ActionResource($action))->resolve();
    }
}
