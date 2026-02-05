<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Core\ErrorCode;
use Helm\Lib\Date;
use Helm\Database\Transaction;
use Helm\ShipLink\Contracts\ActionHandler;
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
        private readonly ShipSystemsRepository $systemsRepository,
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
        if ($action->status->isComplete()) {
            // Action is in a terminal state (fulfilled, failed, partial)
            throw new ActionException(ErrorCode::ActionNotReady, __('Action has already been processed', 'helm'));
        }

        // If Pending, need to claim it first
        if ($action->status === ActionStatus::Pending) {
            if (! $action->isReady()) {
                throw new ActionException(ErrorCode::ActionNotReady, __('Action is not yet ready', 'helm'));
            }

            // Atomically claim
            if (! $this->claim($actionId)) {
                throw new ActionException(ErrorCode::ActionClaimFailed, __('Action is already being processed', 'helm'));
            }

            // Reload with Running status
            $action = $this->actionRepository->find($actionId);
            if ($action === null) {
                throw new ActionException(ErrorCode::ActionNotFound, __('Action no longer exists', 'helm'));
            }
        }

        // At this point, action is Running (either pre-claimed or just claimed)

        // Get resolver class
        $resolverClass = $action->type->getResolverClass();
        if ($resolverClass === null) {
            $error = new ActionException(
                ErrorCode::ActionNoResolver,
                __('This action type is not available', 'helm')
            );
            $this->fail($actionId, $error);
            $this->systemsRepository->updateCurrentAction($action->ship_post_id, null);
            throw $error;
        }

        // Load ship
        $ship = $this->shipFactory->build($action->ship_post_id);

        /** @var ActionHandler $resolver */
        $resolver = $this->container->get($resolverClass);

        Transaction::begin();

        try {
            // Resolver mutates action.result and ship systems
            $resolver->handle($action, $ship);

            $action->fulfill();
            $this->actionRepository->update($action);
            $this->systemsRepository->update($ship->getRecord());
            $this->systemsRepository->updateCurrentAction($action->ship_post_id, null);

            Transaction::commit();

            return $action;
        } catch (ActionException $e) {
            Transaction::rollback();
            $this->fail($actionId, $e);
            $this->systemsRepository->updateCurrentAction($action->ship_post_id, null);
            throw $e;
        } catch (\Throwable $e) {
            Transaction::rollback();
            $error = new ActionException(ErrorCode::ActionFailed, __('Action failed unexpectedly', 'helm'), $e);
            $this->fail($actionId, $error);
            $this->systemsRepository->updateCurrentAction($action->ship_post_id, null);
            throw $error;
        }
    }

    /**
     * Atomically claim an action for processing.
     */
    private function claim(int $actionId): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . 'helm_ship_actions';

        $nowString = Date::nowString();
        $updated = $wpdb->query(
            $wpdb->prepare(
                "UPDATE {$table}
                 SET status = %s, processing_at = %s, updated_at = %s
                 WHERE id = %d AND status = %s",
                ActionStatus::Running->value,
                $nowString,
                $nowString,
                $actionId,
                ActionStatus::Pending->value
            )
        );

        return $updated === 1;
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
