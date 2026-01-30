<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\ShipLink\Contracts\Hull;
use Helm\ShipLink\Contracts\Navigation;
use Helm\ShipLink\Contracts\PowerSystem;
use Helm\ShipLink\Contracts\Propulsion;
use Helm\ShipLink\Contracts\Sensors;
use Helm\ShipLink\Contracts\Shields;
use Helm\ShipLink\Contracts\ShipLink;
use Helm\ShipLink\System\Hull as HullSystem;
use Helm\ShipLink\System\Navigation as NavigationSystem;
use Helm\ShipLink\System\Power;
use Helm\ShipLink\System\Propulsion as PropulsionSystem;
use Helm\ShipLink\System\Sensors as SensorsSystem;
use Helm\ShipLink\System\Shields as ShieldsSystem;

/**
 * Ship implementation of ShipLink.
 *
 * This is the main starship interface. It holds the mutable model
 * and provides access to all ship systems.
 */
final class Ship implements ShipLink
{
    private Power $powerSystem;
    private PropulsionSystem $propulsionSystem;
    private SensorsSystem $sensorSystem;
    private NavigationSystem $navigationSystem;
    private ShieldsSystem $shieldSystem;
    private HullSystem $hullSystem;

    public function __construct(
        private ShipModel $model,
    ) {
        // Initialize all systems with the shared model
        $this->powerSystem = new Power($model);
        $this->propulsionSystem = new PropulsionSystem($model);
        $this->sensorSystem = new SensorsSystem($model);
        $this->navigationSystem = new NavigationSystem($model);
        $this->shieldSystem = new ShieldsSystem($model);
        $this->hullSystem = new HullSystem($model);
    }

    public function getModel(): ShipModel
    {
        return $this->model;
    }

    public function getId(): int
    {
        return $this->model->postId;
    }

    public function getOwnerId(): int
    {
        return $this->model->ownerId;
    }

    public function process(Action $action): ActionResult
    {
        // Basic validation
        if ($this->model->isDestroyed()) {
            return ActionResult::withError('ship', new \WP_Error(
                'ship_destroyed',
                __('Ship is destroyed and cannot perform actions.', 'helm')
            ));
        }

        if ($this->model->isCoreDepeleted()) {
            return ActionResult::withError('power', new \WP_Error(
                'core_depleted',
                __('Core is depleted. Ship is derelict.', 'helm')
            ));
        }

        // Dispatch to action-specific handlers
        return match ($action->type) {
            ActionType::Jump => $this->processJump($action),
            ActionType::ScanRoute => $this->processScanRoute($action),
            ActionType::Survey => $this->processSurvey($action),
            ActionType::ScanPlanet => $this->processScanPlanet($action),
            ActionType::Mine => $this->processMine($action),
            ActionType::Refine => $this->processRefine($action),
            ActionType::Buy => $this->processBuy($action),
            ActionType::Sell => $this->processSell($action),
            ActionType::Transfer => $this->processTransfer($action),
            ActionType::Repair => $this->processRepair($action),
            ActionType::Upgrade => $this->processUpgrade($action),
        };
    }

    public function canProcess(Action $action): bool
    {
        if ($this->model->isDestroyed() || $this->model->isCoreDepeleted()) {
            return false;
        }

        // Action-specific validation could go here
        return true;
    }

    public function power(): PowerSystem
    {
        return $this->powerSystem;
    }

    public function propulsion(): Propulsion
    {
        return $this->propulsionSystem;
    }

    public function sensors(): Sensors
    {
        return $this->sensorSystem;
    }

    public function navigation(): Navigation
    {
        return $this->navigationSystem;
    }

    public function shields(): Shields
    {
        return $this->shieldSystem;
    }

    public function hull(): Hull
    {
        return $this->hullSystem;
    }

    /**
     * Process a jump action.
     */
    private function processJump(Action $action): ActionResult
    {
        $distance = $action->params['distance'] ?? 0.0;
        $targetNodeId = $action->params['target_node_id'] ?? null;

        // Check if we can reach the target
        if (!$this->propulsionSystem->canReach($distance)) {
            return ActionResult::withError('propulsion', new \WP_Error(
                'out_of_range',
                __('Target is beyond jump range.', 'helm')
            ));
        }

        // Calculate and check core cost
        $coreCost = $this->propulsionSystem->calculateCoreCost($distance);
        if ($this->powerSystem->getCoreLife() < $coreCost) {
            return ActionResult::withError('power', new \WP_Error(
                'insufficient_core_life',
                __('Insufficient core life for this jump.', 'helm')
            ));
        }

        // Execute jump
        $this->powerSystem->consumeCoreLife($coreCost);

        if ($targetNodeId !== null) {
            $this->model->nodeId = $targetNodeId;
        }

        $duration = $this->propulsionSystem->getJumpDuration($distance);

        $result = new ActionResult();
        return $result->add('jump', SystemResult::from([
            'distance' => $distance,
            'core_cost' => $coreCost,
            'duration' => $duration,
            'target_node_id' => $targetNodeId,
        ]));
    }

    /**
     * Process a route scan action.
     */
    private function processScanRoute(Action $action): ActionResult
    {
        $distance = $action->params['distance'] ?? 0.0;

        if (!$this->sensorSystem->canScan($distance)) {
            return ActionResult::withError('sensors', new \WP_Error(
                'out_of_range',
                __('Target is beyond sensor range.', 'helm')
            ));
        }

        $powerCost = $this->sensorSystem->getRouteScanCost($distance);
        if (!$this->powerSystem->consume($powerCost)) {
            return ActionResult::withError('power', new \WP_Error(
                'insufficient_power',
                __('Insufficient power for scan.', 'helm')
            ));
        }

        $duration = $this->sensorSystem->getRouteScanDuration($distance);

        $result = new ActionResult();
        return $result->add('scan', SystemResult::from([
            'distance' => $distance,
            'power_cost' => $powerCost,
            'duration' => $duration,
            'success_chance' => $this->sensorSystem->getScanSuccessChance(),
        ]));
    }

    /**
     * Process a system survey action.
     */
    private function processSurvey(Action $action): ActionResult
    {
        // Surveys consume power over time
        $duration = $action->params['duration'] ?? 3600; // Default 1 hour
        $hours = $duration / 3600.0;
        $powerCost = $this->sensorSystem->getSurveyCostPerHour() * $hours;

        if (!$this->powerSystem->consume($powerCost)) {
            return ActionResult::withError('power', new \WP_Error(
                'insufficient_power',
                __('Insufficient power for survey.', 'helm')
            ));
        }

        $result = new ActionResult();
        return $result->add('survey', SystemResult::from([
            'duration' => $duration,
            'power_cost' => $powerCost,
        ]));
    }

    /**
     * Process a planet scan action.
     */
    private function processScanPlanet(Action $action): ActionResult
    {
        $powerCost = 5.0; // Base cost for planet scan

        if (!$this->powerSystem->consume($powerCost)) {
            return ActionResult::withError('power', new \WP_Error(
                'insufficient_power',
                __('Insufficient power for planet scan.', 'helm')
            ));
        }

        $result = new ActionResult();
        return $result->add('planet_scan', SystemResult::from([
            'power_cost' => $powerCost,
        ]));
    }

    /**
     * Process a mining action.
     */
    private function processMine(Action $action): ActionResult
    {
        // Mining will be implemented with resource systems
        $result = new ActionResult();
        return $result->add('mine', SystemResult::from(['status' => 'not_implemented']));
    }

    /**
     * Process a refining action.
     */
    private function processRefine(Action $action): ActionResult
    {
        // Refining will be implemented with resource systems
        $result = new ActionResult();
        return $result->add('refine', SystemResult::from(['status' => 'not_implemented']));
    }

    /**
     * Process a buy action.
     */
    private function processBuy(Action $action): ActionResult
    {
        // Trading will be implemented with economy systems
        $result = new ActionResult();
        return $result->add('buy', SystemResult::from(['status' => 'not_implemented']));
    }

    /**
     * Process a sell action.
     */
    private function processSell(Action $action): ActionResult
    {
        // Trading will be implemented with economy systems
        $result = new ActionResult();
        return $result->add('sell', SystemResult::from(['status' => 'not_implemented']));
    }

    /**
     * Process a cargo transfer action.
     */
    private function processTransfer(Action $action): ActionResult
    {
        $resource = $action->params['resource'] ?? '';
        $quantity = $action->params['quantity'] ?? 0;
        $direction = $action->params['direction'] ?? 'load'; // load or unload

        if ($direction === 'load') {
            $this->model->addCargo($resource, $quantity);
        } else {
            $removed = $this->model->removeCargo($resource, $quantity);
            $quantity = $removed;
        }

        $result = new ActionResult();
        return $result->add('transfer', SystemResult::from([
            'resource' => $resource,
            'quantity' => $quantity,
            'direction' => $direction,
        ]));
    }

    /**
     * Process a repair action.
     */
    private function processRepair(Action $action): ActionResult
    {
        $amount = $action->params['amount'] ?? 0.0;

        $before = $this->hullSystem->getIntegrity();
        $this->hullSystem->repair($amount);
        $after = $this->hullSystem->getIntegrity();

        $result = new ActionResult();
        return $result->add('repair', SystemResult::from([
            'amount' => $after - $before,
            'integrity' => $after,
        ]));
    }

    /**
     * Process an upgrade action.
     */
    private function processUpgrade(Action $action): ActionResult
    {
        // Upgrades will be implemented with station systems
        $result = new ActionResult();
        return $result->add('upgrade', SystemResult::from(['status' => 'not_implemented']));
    }
}
