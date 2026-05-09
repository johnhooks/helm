<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Core\ErrorCode;
use Helm\Database\Transaction;
use Helm\Inventory\Contracts\InventoryRepository;
use Helm\Lib\Date;
use Helm\ShipLink\Contracts\ActionHandler;
use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\ShipLink\Models\Action;
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
            $this->fail($actionId, $error);
            $this->stateRepository->updateCurrentAction($action->ship_post_id, null);
            throw $error;
        }

        // Load ship
        $ship = $this->shipFactory->build($action->ship_post_id);

        /** @var ActionHandler $resolver */
        $resolver = $this->container->get($resolverClass);

        Transaction::begin();

        try {
            // Resolver mutates action.result and ship state/systems
            $resolver->handle($action, $ship);

            if (! $action->type->isMultiphase() && ! $action->status->isFinalState()) {
                $action->fulfill();
            }

            if (! $action->status->isFinalState()) {
                $action->status = ActionStatus::Running;
                $action->processing_at = null;
                $action->broadcast_at = Date::now();
            }

            $this->actionRepository->update($action);
            $this->stateRepository->update($ship->getState());

            foreach ($ship->getLoadout()->dirtyComponents() as $component) {
                $this->inventoryRepository->update($component);
            }

            if ($action->status->isFinalState()) {
                $this->stateRepository->updateCurrentAction($action->ship_post_id, null);
            }

            Transaction::commit();

            return $action;
        } catch (ActionException $e) {
            Transaction::rollback();
            $this->fail($actionId, $e);
            $this->stateRepository->updateCurrentAction($action->ship_post_id, null);
            throw $e;
        } catch (\Throwable $e) {
            Transaction::rollback();
            $error = new ActionException(ErrorCode::ActionFailed, __('Action failed unexpectedly', 'helm'), $e);
            $this->fail($actionId, $error);
            $this->stateRepository->updateCurrentAction($action->ship_post_id, null);
            throw $error;
        }
    }

    /**
     * Mark an action as failed.
     */
    private function fail(int $actionId, ActionException $error): void
    {
        $action = $this->actionRepository->find($actionId);
        if ($action !== null) {
            $action->fail($error->toWpError());
            $this->actionRepository->update($action);
        }
    }
}
