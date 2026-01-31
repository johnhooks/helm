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

/**
 * Ship implementation of ShipLink.
 *
 * This is the main starship interface. It holds the mutable model
 * and provides access to all ship systems.
 *
 * All systems are injected via constructor - use ShipFactory to build.
 */
final class Ship implements ShipLink
{
    public function __construct(
        private ShipModel $model,
        private PowerSystem $powerSystem,
        private Propulsion $propulsionSystem,
        private Sensors $sensorSystem,
        private Navigation $navigationSystem,
        private Shields $shieldSystem,
        private Hull $hullSystem,
    ) {
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
     *
     * Ship orchestrates: gathers route info, calculates costs, executes via systems.
     */
    private function processJump(Action $action): ActionResult
    {
        $targetNodeId = $action->params['target_node_id'] ?? null;

        if ($targetNodeId === null) {
            return ActionResult::withError('navigation', new \WP_Error(
                'no_target',
                __('No target node specified.', 'helm')
            ));
        }

        // 1. Navigation system validates graph and gets route info
        $routeInfo = $this->navigationSystem->getRouteInfo($targetNodeId);
        if (is_wp_error($routeInfo)) {
            return ActionResult::withError('navigation', $routeInfo);
        }

        $distance = $routeInfo->distance;

        // 2. Check propulsion can handle the distance
        if (!$this->propulsionSystem->canReach($distance)) {
            return ActionResult::withError('propulsion', new \WP_Error(
                'out_of_range',
                __('Target is beyond jump range.', 'helm'),
                ['distance' => $distance, 'max_range' => $this->propulsionSystem->getMaxRange()]
            ));
        }

        // 3. Calculate costs (Ship orchestrates, gathering from systems)
        $coreCost = $this->calculateJumpCoreCost($distance);
        $duration = $this->propulsionSystem->getJumpDuration($distance);

        // 4. Validate resources
        if ($this->powerSystem->getCoreLife() < $coreCost) {
            return ActionResult::withError('power', new \WP_Error(
                'insufficient_core_life',
                __('Insufficient core life for this jump.', 'helm'),
                ['required' => $coreCost, 'available' => $this->powerSystem->getCoreLife()]
            ));
        }

        // 5. Execute via system calls
        $this->powerSystem->consumeCoreLife($coreCost);
        $this->navigationSystem->setPosition($targetNodeId);

        // 6. Return result
        $result = new ActionResult();
        return $result->add('jump', SystemResult::from([
            'distance' => $distance,
            'core_cost' => $coreCost,
            'duration' => $duration,
            'target_node_id' => $targetNodeId,
        ]));
    }

    /**
     * Calculate core life cost for a jump.
     *
     * Gathers contributions from relevant systems.
     */
    private function calculateJumpCoreCost(float $distance): float
    {
        // Core cost = distance × core multiplier × drive decay × power mode decay
        // Efficiency mode (decay = 0) means no core cost - safe harbor
        return $distance
            * $this->model->coreType->jumpCostMultiplier()
            * $this->propulsionSystem->getCoreDecayMultiplier()
            * $this->powerSystem->getDecayMultiplier();
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
