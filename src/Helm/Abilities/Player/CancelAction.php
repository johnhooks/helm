<?php

declare(strict_types=1);

namespace Helm\Abilities\Player;

use Helm\Core\ErrorCode;
use Helm\Abilities\Support\Schemas;
use Helm\Rest\ShipActionsController;
use Helm\ShipLink\ActionCancellation;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\Resources\ActionResource;
use WP_Error;
use WP_REST_Request;

final class CancelAction
{
    public function __construct(
        private readonly ActionCancellation $cancellation,
        private readonly ShipActionsController $permissions,
    ) {
    }

    public function register(): void
    {
        $id = ['type' => 'integer', 'minimum' => 1];
        $action = Schemas::action();

        wp_register_ability('helm/cancel-action', [
            'label' => __('Cancel my action', 'helm'),
            'description' => __('Stop an active route scan immediately, preserving discoveries and spent power. No additional cycle runs. Finished actions are returned unchanged. If a worker owns the action, retry after its update. Jump cancellation is not supported yet.', 'helm'),
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
                    'readonly' => false,
                    'destructive' => true,
                    'idempotent' => true,
                ],
            ],
        ]);
    }

    /** @param array<string, mixed> $input */
    public function canExecute(array $input): bool|WP_Error
    {
        if (! isset($input['action_id'])) {
            return ErrorCode::InputActionIdRequired->error(__('action_id is required. Inspect your ship to find its current_action_id.', 'helm'), ['status' => ErrorCode::InputActionIdRequired->httpStatus()]);
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
        try {
            return (new ActionResource($this->cancellation->cancel((int) $input['action_id'])))->resolve();
        } catch (ActionException $exception) {
            $error = $exception->toWpError();
            $error->add_data(['status' => $exception->errorCode->httpStatus()]);
            return $error;
        }
    }
}
