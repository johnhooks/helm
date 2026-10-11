<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Core\ErrorCode;
use Psr\Log\LoggerInterface;
use Helm\Database\Transaction;
use Helm\Events\Contracts\EventDispatcher;
use Helm\Inventory\Contracts\InventoryRepository;
use Helm\ShipLink\Broadcasting\ShipActionUpdated;
use Helm\ShipLink\Broadcasting\ShipStateUpdated;
use Helm\ShipLink\Contracts\ActionHandler;
use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\Contracts\ActionValidator;
use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Models\ShipState;
use Helm\lucatume\DI52\Container;

/**
 * Creates and schedules ship actions.
 *
 * Entry point for dispatching new actions. Uses Validator to check preconditions,
 * Handler to set up the action (calculate values, set deferred_until).
 */
final class ActionFactory
{
    public function __construct(
        private readonly Container $container,
        private readonly ActionRepository $actionRepository,
        private readonly ShipStateRepository $stateRepository,
        private readonly InventoryRepository $inventoryRepository,
        private readonly ShipFactory $shipFactory,
        private readonly EventDispatcher $events,
        private readonly LoggerInterface $logger,
    ) {
    }

    /**
     * Create and schedule an action.
     *
     * @param array<string, mixed> $params
     * @throws ActionException If creation fails
     */
    public function create(int $shipPostId, ActionType $type, array $params): Action
    {
        // Get validator and handler classes
        $validatorClass = $type->getValidatorClass();
        $handlerClass = $type->getHandlerClass();

        if ($validatorClass === null || $handlerClass === null) {
            throw new ActionException(
                ErrorCode::ActionNoHandler,
                __('This action type is not available', 'helm')
            );
        }

        // Build action model
        $action = new Action([
            'ship_post_id' => $shipPostId,
            'type' => $type,
            'params' => $params,
        ]);

        // Load ship
        $ship = $this->shipFactory->build($shipPostId);

        // Validate
        /** @var ActionValidator $validator */
        $validator = $this->container->get($validatorClass);
        $validator->validate($action, $ship);

        // Handle (sets status, deferred_until, result)
        /** @var ActionHandler $handler */
        $handler = $this->container->get($handlerClass);
        $handler->handle($action, $ship);

        Transaction::begin();

        try {
            // Lock the ship state row first - fails fast if another transaction has it
            try {
                $currentActionId = $this->stateRepository->lockForUpdate($shipPostId);
            } catch (\RuntimeException $e) {
                $this->logger->debug('Operation {event} failed', [
                    'event' => 'action.lock_failed',
                    'ship_id' => $shipPostId,
                    'reason' => $e->getMessage(),
                ]);
                throw new ActionException(
                    ErrorCode::ActionInProgress,
                    __('Ship is busy with another action', 'helm')
                );
            }

            if ($currentActionId !== null) {
                throw new ActionException(
                    ErrorCode::ActionInProgress,
                    __('Ship is busy with another action', 'helm')
                );
            }

            // Slot is free and locked - safe to insert
            if (!$this->actionRepository->insert($action)) {
                throw new ActionException(
                    ErrorCode::ActionInsertFailed,
                    __('Unable to queue action', 'helm')
                );
            }

            $state = $ship->getState();
            $state->current_action_id = $action->id;
            $this->stateRepository->update($state);

            // Deferred actions stay in DB - cron will pick them up when ready
            // Immediate actions are resolved inline
            if ($action->deferred_until === null) {
                $action = $this->resolveImmediate($action, $type, $ship);
            }

            $this->dispatchUpdates($action, $ship->getState());

            Transaction::commit();
            $this->logger->info('Action {action_id} queued for ship {ship_id}', [
                'event' => 'action.queued',
                'action_id' => $action->id,
                'ship_id' => $shipPostId,
                'action_type' => $type->value,
                'deferred_until' => $action->deferred_until?->format('c'),
            ]);

            return $action;
        } catch (\Throwable $e) {
            $this->logger->warning('Operation {event} failed', [
                'event' => 'action.creation_failed',
                'ship_id' => $shipPostId,
                'action_type' => $type->value,
                'reason' => $e->getMessage(),
            ]);
            // Rollback undoes everything: insert, current_action_id update, etc.
            // Ship is left in clean state as if action was never attempted.
            Transaction::rollback();
            throw $e;
        }
    }

    /**
     * Resolve an immediate (non-deferred) action.
     *
     * Runs inside the create() transaction. On success, all changes commit together.
     * On failure, everything rolls back - as if the action was never attempted.
     */
    private function resolveImmediate(Action $action, ActionType $type, Ship $ship): Action
    {
        $resolverClass = $type->getResolverClass();
        if ($resolverClass === null) {
            throw new ActionException(
                ErrorCode::ActionNoResolver,
                __('This action type is not available', 'helm')
            );
        }

        /** @var ActionHandler $resolver */
        $resolver = $this->container->get($resolverClass);
        $resolver->handle($action, $ship);

        $action->fulfill();
        $this->actionRepository->update($action);

        $state = $ship->getState();
        $state->current_action_id = null;
        $this->stateRepository->update($state);

        foreach ($ship->getLoadout()->dirtyComponents() as $component) {
            $this->inventoryRepository->update($component);
        }

        return $action;
    }

    private function dispatchUpdates(Action $action, ShipState $state): void
    {
        $this->events->dispatch(new ShipActionUpdated($action));
        $this->events->dispatch(new ShipStateUpdated($state));
    }
}
