<?php

declare(strict_types=1);

namespace Helm\Abilities\Player;

use Helm\Core\ErrorCode;
use Helm\Rest\ShipActionsController;
use Helm\ShipLink\Resources\ShipStateResource;
use Helm\ShipLink\ShipFactory;
use WP_Error;
use WP_REST_Request;

final class InspectShip
{
    public function __construct(
        private readonly ShipFactory $ships,
        private readonly ShipActionsController $permissions,
    ) {
    }

    public function register(): void
    {
        $id = ['type' => 'integer', 'minimum' => 1];
        $ship = ['ship_id' => $id];
        $object = ['type' => 'object'];

        wp_register_ability('helm/inspect-ship', [
            'label' => __('Inspect my ship', 'helm'),
            'description' => __('Read current ship state, available power, remaining core life, and effective sensor and jump ranges. current_action_id identifies any active action.', 'helm'),
            'category' => 'helm',
            'input_schema' => [
                'type' => 'object',
                'properties' => $ship,
                'required' => ['ship_id'],
                'additionalProperties' => false,
            ],
            'output_schema' => [
                'type' => 'object',
                'properties' => [
                    'ship_id' => $id, 'name' => ['type' => 'string'], 'state' => $object,
                    'power' => ['type' => 'number'], 'core_life' => ['type' => 'number'],
                    'sensor_range_ly' => ['type' => 'number'], 'jump_range_ly' => ['type' => 'number'],
                ],
                'required' => ['ship_id', 'name', 'state', 'power', 'core_life', 'sensor_range_ly', 'jump_range_ly'],
            ],
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
     * @return array<string, mixed>
     */
    public function execute(array $input): array
    {
        $ship = $this->ships->build((int) $input['ship_id']);
        return [
            'ship_id' => $ship->getId(),
            'name' => $ship->getName(),
            'state' => (new ShipStateResource($ship->getState()))->resolve(),
            'power' => $ship->power()->getCurrentPower(),
            'core_life' => $ship->power()->getCoreLife(),
            'sensor_range_ly' => $ship->sensors()->getRange(),
            'jump_range_ly' => $ship->propulsion()->getMaxRange(),
        ];
    }
}
