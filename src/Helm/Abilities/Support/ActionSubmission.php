<?php

declare(strict_types=1);

namespace Helm\Abilities\Support;

use Psr\Log\LoggerInterface;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\ActionFactory;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Resources\ActionResource;
use WP_Error;

/** Submit through the game service and preserve diagnostics for both write abilities. */
final class ActionSubmission
{
    public function __construct(
        private readonly ActionFactory $actions,
        private readonly LoggerInterface $logger,
    ) {
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>|WP_Error
     */
    public function submit(int $shipId, ActionType $type, array $params): array|WP_Error
    {
        try {
            return (new ActionResource($this->actions->create($shipId, $type, $params)))->resolve();
        } catch (ActionException $error) {
            $this->logger->warning('Ability request rejected: {reason}', [
                'event' => 'ability.action_rejected',
                'reason' => $error->getMessage(),
            ]);
            $result = $error->toWpError();
            $result->add_data([
                'status' => $error->errorCode->httpStatus(),
                'ship_id' => $shipId,
                'action_type' => $type->value,
                'params' => $params,
                'next_step' => 'Inspect the ship and its current action, then check targets or known edges before changing the request. Do not blindly retry a submission.',
            ]);
            return $result;
        }
    }
}
