<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\ScanRoute;

use Helm\Core\ErrorCode;
use Helm\Lib\Date;
use Helm\Navigation\NavigationService;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\Contracts\ActionHandler;
use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Ship;

/** Snapshot scan performance at launch; available core is checked each cycle. */
final class Handler implements ActionHandler
{
    public function __construct(
        private readonly Rules $rules,
        private readonly NavigationService $navigation,
        private readonly ActionRepository $actions,
    ) {
    }

    public function handle(Action $action, Ship $ship): void
    {
        $params = Params::fromArray($action->params);
        $origin = $params->fromNodeId ?? 0;
        $target = $params->targetNodeId ?? 0;
        $state = $this->rules->initialize(
            $params,
            $ship,
            $this->navigation->calculateDistance($origin, $target) ?? 0,
        );
        $state->source = $origin;
        $state->startedAt = Date::nowString();
        $result = new Result(path: [$origin]);
        $previous = $this->actions->findLatestScan($ship->getId(), $origin, $target);
        if ($previous !== null && $previous->runtime_state !== null) {
            $prior = RuntimeState::fromArray($previous->runtime_state);
            $state->source = $prior->source;
            $state->depth = $prior->depth;
            $state->work = $prior->work;
            $result = Result::fromArray($previous->result ?? []);
        }
        if ($state->source === $target) {
            throw new ActionException(ErrorCode::NavigationAlreadyAtTarget, __('This scan has already discovered the destination. Travel along the known route.', 'helm'));
        }
        if (!$this->rules->prepareConnection($state, $params)) {
            throw new ActionException(ErrorCode::NavigationInvalidTarget, __('Scan destination is unavailable.', 'helm'));
        }
        $stop = $this->rules->stopReason($state, $ship->power()->getCoreLife());
        if ($stop !== null) {
            throw new ActionException(ErrorCode::NavigationScanStopped, $stop->message());
        }
        $action->params = $params->toArray();
        $action->runtime_state = $state->toArray();
        $action->status = ActionStatus::Pending;
        $action->deferred_until = Date::addSeconds(Date::now(), $state->cycleSeconds);
        // A resumed scan retains discoveries and starts a new attempt.
        $action->result = [...$result->toArray(), 'stop_reason' => null];
    }
}
