<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Core\ErrorCode;
use Helm\Database\Transaction;
use Helm\Events\Contracts\EventDispatcher;
use Helm\Inventory\Contracts\InventoryRepository;
use Helm\ShipLink\Contracts\ActionHandler;
use Helm\ShipLink\Broadcasting\ShipActionUpdated;
use Helm\ShipLink\Broadcasting\ShipStateUpdated;
use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Models\ShipState;
use Helm\lucatume\DI52\Container;

/**
 * Resolves scheduled ship actions.
 *
 * Called by Action Scheduler when deferred time has passed.
 * Delegates to type-specific resolver classes for execution.
 */
final class ActionResolver
{
    public function __construct(
        private readonly Container $container,
        private readonly ActionRepository $actionRepository,
        private readonly ShipStateRepository $stateRepository,
        private readonly InventoryRepository $inventoryRepository,
        private readonly ShipFactory $shipFactory,
        private readonly EventDispatcher $events,
    ) {
    }

    /**
     * Resolve a scheduled action.
     *
     * @throws ActionException If resolution fails
     */
    public function resolve(int $actionId): Action
    {
        $action = $this->actionRepository->find($actionId);
        if ($action === null) {
            throw new ActionException(ErrorCode::ActionNotFound, __('Action no longer exists', 'helm'));
        }

        // Handle based on current status
        if ($action->status->isFinalState()) {
            // Action is in a terminal state (fulfilled, failed, partial)
            throw new ActionException(ErrorCode::ActionNotReady, __('Action has already been processed', 'helm'));
        }

        // Get resolver class
        $resolverClass = $action->type->getResolverClass();
        if ($resolverClass === null) {
            $error = new ActionException(
                ErrorCode::ActionNoResolver,
                __('This action type is not available', 'helm')
            );
            $this->failAndDispatch($actionId, $action->ship_post_id, $error);
            throw $error;
        }

        // Load ship
        $ship = $this->shipFactory->build($action->ship_post_id);

        /** @var ActionHandler $resolver */
        $resolver = $this->container->get($resolverClass);

        try {
            return $this->resolveAndDispatch($action, $ship, $resolver);
        } catch (ActionException $e) {
            $this->failAndDispatch($actionId, $action->ship_post_id, $e);
            throw $e;
        } catch (\Throwable $e) {
            $error = new ActionException(ErrorCode::ActionFailed, __('Action failed unexpectedly', 'helm'), $e);
            $this->failAndDispatch($actionId, $action->ship_post_id, $error);
            throw $error;
        }
    }

    private function resolveAndDispatch(Action $action, Ship $ship, ActionHandler $resolver): Action
    {
        return Transaction::run(function () use ($action, $ship, $resolver): Action {
            // Resolver mutates action.result and ship state/systems
            $resolver->handle($action, $ship);

            if (! $action->type->isMultiphase() && ! $action->status->isFinalState()) {
                $action->fulfill();
            }

            if (! $action->status->isFinalState()) {
                $action->status = ActionStatus::Running;
            }

            $this->actionRepository->update($action);

            $state = $ship->getState();
            if ($action->status->isFinalState()) {
                $state->current_action_id = null;
            }

            $this->stateRepository->update($state);

            foreach ($ship->getLoadout()->dirtyComponents() as $component) {
                $this->inventoryRepository->update($component);
            }

            $this->dispatchUpdates($action, $state);

            return $action;
        });
    }

    private function failAndDispatch(int $actionId, int $shipPostId, ActionException $error): ?Action
    {
        return Transaction::run(function () use ($actionId, $shipPostId, $error): ?Action {
            $failedAction = $this->fail($actionId, $error);
            $state = $this->clearCurrentAction($shipPostId);
            $this->dispatchUpdates($failedAction, $state);

            return $failedAction;
        });
    }

    /**
     * Mark an action as failed.
     */
    private function fail(int $actionId, ActionException $error): ?Action
    {
        $action = $this->actionRepository->find($actionId);
        if ($action !== null) {
            $action->fail($error->toWpError());
            $this->actionRepository->update($action);
        }

        return $action;
    }

    private function clearCurrentAction(int $shipPostId): ?ShipState
    {
        $state = $this->stateRepository->find($shipPostId);
        if ($state === null) {
            return null;
        }

        $state->current_action_id = null;
        $this->stateRepository->update($state);

        return $state;
    }

    private function dispatchUpdates(?Action $action, ?ShipState $state): void
    {
        if ($action !== null) {
            $this->events->dispatch(new ShipActionUpdated($action));
        }

        if ($state !== null) {
            $this->events->dispatch(new ShipStateUpdated($state));
        }
    }
}
