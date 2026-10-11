<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Core\ErrorCode;
use Helm\Database\Transaction;
use Helm\Events\Contracts\EventDispatcher;
use Helm\ShipLink\Broadcasting\ShipActionUpdated;
use Helm\ShipLink\Broadcasting\ShipStateUpdated;
use Helm\ShipLink\Contracts\ActionHandler;
use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\ShipLink\Models\Action;
use Helm\lucatume\DI52\Container;
use Psr\Log\LoggerInterface;

/**
 * Serialize cancellation against queue claims and delegate action-specific behavior.
 */
final class ActionCancellation
{
    public function __construct(
        private readonly ActionRepository $actions,
        private readonly ShipStateRepository $states,
        private readonly ShipFactory $ships,
        private readonly Container $container,
        private readonly EventDispatcher $events,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function cancel(int $actionId): Action
    {
        $changed = false;
        $action = Transaction::run(function () use ($actionId, &$changed): Action {
            $action = $this->actions->findForUpdate($actionId);
            if ($action === null) {
                throw new ActionException(ErrorCode::ActionNotFound, __('Action not found.', 'helm'));
            }
            if ($action->status->isFinalState()) {
                return $action;
            }
            $handlerClass = $action->type->getCancellationHandlerClass();
            if ($handlerClass === null) {
                throw new ActionException(ErrorCode::ActionCancellationUnsupported, __('This action does not support cancellation.', 'helm'));
            }
            if ($action->isProcessing()) {
                throw new ActionException(ErrorCode::ActionInProgress, __('An action update is being processed. Retry cancellation after the update.', 'helm'));
            }
            $ship = $this->ships->build($action->ship_post_id);
            /** @var ActionHandler $handler */
            $handler = $this->container->get($handlerClass);
            $handler->handle($action, $ship);
            $state = $ship->getState();
            if ($action->status->isFinalState() && $state->current_action_id === $action->id) {
                $state->current_action_id = null;
            }
            if (!$this->actions->update($action) || !$this->states->update($state)) {
                throw new ActionException(ErrorCode::ActionFailed, __('Could not save cancellation. Inspect the action before retrying.', 'helm'));
            }
            $changed = true;
            return $action;
        });
        if ($changed) {
            $this->logger->info('Action {action_id} canceled by player request', [
                'event' => 'action.canceled',
                'action_id' => $action->id,
                'ship_id' => $action->ship_post_id,
            ]);
            $this->events->dispatch(new ShipActionUpdated($action));
            $state = $this->states->find($action->ship_post_id);
            if ($state !== null) {
                $this->events->dispatch(new ShipStateUpdated($state));
            }
        }
        return $action;
    }
}
