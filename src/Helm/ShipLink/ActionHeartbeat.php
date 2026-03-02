<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Lib\Date;
use Helm\ShipLink\Contracts\ActionRepository;

/**
 * Delivers action state updates via the WordPress Heartbeat API.
 *
 * Broadcast protocol: the client sends a cursor (`since`) and the server
 * returns all actions that transitioned since that time, plus the current
 * `server_time` for the next cursor. Each tab tracks its own cursor.
 */
final class ActionHeartbeat
{
    public function __construct(
        private readonly ActionRepository $actionRepository,
    ) {
    }

    /**
     * Handle a heartbeat tick.
     *
     * @param array<string, mixed> $response Heartbeat response data.
     * @param array<string, mixed> $data     Heartbeat request data from client.
     * @return array<string, mixed>
     */
    public function handle(array $response, array $data): array
    {
        if (! isset($data['helm_actions'])) {
            return $response;
        }

        $userId = get_current_user_id();

        if ($userId === 0) {
            return $response;
        }

        $payload = $data['helm_actions'];
        $sinceString = $payload['since'] ?? '';

        if ($sinceString !== '' && is_string($sinceString)) {
            $since = Date::fromString($sinceString);
        } else {
            $since = Date::subSeconds(Date::now(), 30);
        }

        $actions = $this->actionRepository->findBroadcastsSince($since, $userId);

        $response['helm_actions'] = [
            'actions'     => array_map([$this, 'serialize'], $actions),
            'server_time' => Date::now()->format('c'),
        ];

        return $response;
    }

    /**
     * Serialize an action for the heartbeat response.
     *
     * @return array<string, mixed>
     */
    private function serialize(Models\Action $action): array
    {
        return [
            'id'             => $action->id,
            'ship_post_id'   => $action->ship_post_id,
            'type'           => $action->type->value,
            'status'         => $action->status->value,
            'params'         => $action->params,
            'result'         => $action->result,
            'deferred_until' => $action->deferred_until?->format('c'),
            'created_at'     => $action->created_at->format('c'),
            'updated_at'     => $action->updated_at->format('c'),
        ];
    }
}
