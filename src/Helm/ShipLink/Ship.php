<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\ShipLink\Contracts\Cargo;
use Helm\ShipLink\Contracts\Hull;
use Helm\ShipLink\Contracts\Navigation;
use Helm\ShipLink\Contracts\PowerSystem;
use Helm\ShipLink\Contracts\Propulsion;
use Helm\ShipLink\Contracts\Sensors;
use Helm\ShipLink\Contracts\Shields;
use Helm\ShipLink\Contracts\ShipLink;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Models\ShipState;
use Helm\Ships\ShipPost;

/**
 * Ship implementation of ShipLink.
 *
 * This is the main starship interface and the ONLY mutator of ShipState/ShipSystems.
 * Systems are read-only - they report state and calculate values.
 * Ship orchestrates by gathering data from systems, making decisions,
 * and applying mutations directly to ShipState (operational) or ShipSystems (component).
 *
 * All systems are injected via constructor - use ShipFactory to build.
 */
final class Ship implements ShipLink
{
    public function __construct(
        private ShipPost $post,
        private ShipState $state,
        private Loadout $loadout,
        private PowerSystem $powerSystem,
        private Propulsion $propulsionSystem,
        private Sensors $sensorSystem,
        private Navigation $navigationSystem,
        private Shields $shieldSystem,
        private Hull $hullSystem,
        private Cargo $cargoSystem,
    ) {
    }

    public function getState(): ShipState
    {
        return $this->state;
    }

    public function getLoadout(): Loadout
    {
        return $this->loadout;
    }

    public function getId(): int
    {
        return $this->post->postId();
    }

    public function getName(): string
    {
        return $this->post->name();
    }

    public function getOwnerId(): int
    {
        return $this->post->ownerId();
    }

    public function process(Action $action): ActionResult
    {
        // Basic validation - use Systems for state checks
        if ($this->hullSystem->isDestroyed()) {
            return ActionResult::withError('ship', new \WP_Error(
                'ship_destroyed',
                __('Ship is destroyed and cannot perform actions.', 'helm')
            ));
        }

        if ($this->powerSystem->isDepleted()) {
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
        if ($this->hullSystem->isDestroyed() || $this->powerSystem->isDepleted()) {
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

    public function cargo(): Cargo
    {
        return $this->cargoSystem;
    }

    /**
     * Process a jump action.
     *
     * Ship orchestrates: gathers data from systems, validates, mutates directly.
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

        // 1. Navigation system reports route info
        $routeInfo = $this->navigationSystem->getRouteInfo($targetNodeId);
        if (is_wp_error($routeInfo)) {
            return ActionResult::withError('navigation', $routeInfo);
        }

        $distance = $routeInfo->distance;

        // 2. Propulsion reports if it can reach
        if (!$this->propulsionSystem->canReach($distance)) {
            return ActionResult::withError('propulsion', new \WP_Error(
                'out_of_range',
                __('Target is beyond jump range.', 'helm'),
                ['distance' => $distance, 'max_range' => $this->propulsionSystem->getMaxRange()]
            ));
        }

        // 3. Calculate costs (gathering from systems)
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

        // 5. Ship mutates directly - core life on component, node_id on state
        $coreComponent = $this->loadout->core()->component();
        $coreComponent->life = max(0, (int) (($coreComponent->life ?? 0) - ceil($coreCost)));
        $this->state->node_id = $targetNodeId;

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
        // mult_b is the jump cost multiplier for cores
        $jumpCostMultiplier = $this->loadout->core()->product()->mult_b ?? 1.0;

        return $distance
            * $jumpCostMultiplier
            * $this->propulsionSystem->getCoreDecayMultiplier()
            * $this->powerSystem->getDecayMultiplier();
    }

    /**
     * Process a route scan action.
     */
    private function processScanRoute(Action $action): ActionResult
    {
        $distance = $action->params['distance'] ?? 0.0;

        // Sensors report if scan is possible
        if (!$this->sensorSystem->canScan($distance)) {
            return ActionResult::withError('sensors', new \WP_Error(
                'out_of_range',
                __('Target is beyond sensor range.', 'helm')
            ));
        }

        $powerCost = $this->sensorSystem->getRouteScanCost($distance);

        // Power reports if enough available
        if (!$this->powerSystem->hasAvailable($powerCost)) {
            return ActionResult::withError('power', new \WP_Error(
                'insufficient_power',
                __('Insufficient power for scan.', 'helm')
            ));
        }

        // Ship mutates state directly - power_full_at is operational state
        $this->state->power_full_at = $this->powerSystem->calculatePowerFullAtAfterConsumption($powerCost);

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

        if (!$this->powerSystem->hasAvailable($powerCost)) {
            return ActionResult::withError('power', new \WP_Error(
                'insufficient_power',
                __('Insufficient power for survey.', 'helm')
            ));
        }

        // Ship mutates state directly
        $this->state->power_full_at = $this->powerSystem->calculatePowerFullAtAfterConsumption($powerCost);

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

        if (!$this->powerSystem->hasAvailable($powerCost)) {
            return ActionResult::withError('power', new \WP_Error(
                'insufficient_power',
                __('Insufficient power for planet scan.', 'helm')
            ));
        }

        // Ship mutates state directly
        $this->state->power_full_at = $this->powerSystem->calculatePowerFullAtAfterConsumption($powerCost);

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
            // Ship mutates state directly using cargo's calculation
            $this->state->cargo = $this->cargoSystem->calculateCargoAfterAdd($resource, $quantity);
        } else {
            // Ship mutates state directly using cargo's calculation
            $cargoResult = $this->cargoSystem->calculateCargoAfterRemove($resource, $quantity);
            $this->state->cargo = $cargoResult['cargo'];
            $quantity = $cargoResult['removed'];
        }

        $actionResult = new ActionResult();
        return $actionResult->add('transfer', SystemResult::from([
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

        // Ship mutates state directly using hull's calculation
        $this->state->hull_integrity = $this->hullSystem->calculateIntegrityAfterRepair($amount);

        $after = $this->state->hull_integrity;

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
