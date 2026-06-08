<?php

declare(strict_types=1);

namespace Helm\Broadcasting;

use Helm\Broadcasting\Contracts\EventRepository;
use Helm\Core\ErrorCode;
use Helm\Ships\ShipPost;
use WP_Error;

/**
 * Delivers durable broadcast events via the WordPress Heartbeat API.
 */
final class Heartbeat
{
    private const MAX_CHANNELS = 16;

    public function __construct(
        private readonly EventRepository $events,
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
        if (! isset($data['helm_broadcast']) || ! is_array($data['helm_broadcast'])) {
            return $response;
        }

        $userId = get_current_user_id();

        if ($userId === 0) {
            return $response;
        }

        $channels = $data['helm_broadcast']['channels'] ?? [];
        if ($this->hasTooManyChannels($channels)) {
            $response['helm_broadcast'] = [
                'channels' => [],
                'error'    => $this->serializeError(ErrorCode::BroadcastTooManyChannels->error(
                    sprintf(
                        /* translators: %d: Maximum number of channels allowed per heartbeat request. */
                        __('You may listen to at most %d channels per heartbeat request.', 'helm'),
                        self::MAX_CHANNELS
                    ),
                    ['status' => ErrorCode::BroadcastTooManyChannels->httpStatus()],
                )),
            ];

            return $response;
        }

        $response['helm_broadcast'] = [
            'channels' => $this->channelResponses($channels, $userId),
        ];

        return $response;
    }

    private function hasTooManyChannels(mixed $channels): bool
    {
        if (! is_array($channels)) {
            return false;
        }

        $count = 0;
        foreach ($channels as $channel => $_cursor) {
            if (! is_string($channel)) {
                continue;
            }

            $count++;
            if ($count > self::MAX_CHANNELS) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param mixed $channels
     * @return array<string, array<string, mixed>>
     */
    private function channelResponses(mixed $channels, int $userId): array
    {
        if (! is_array($channels)) {
            return [];
        }

        $responses = [];
        foreach ($channels as $channel => $cursor) {
            if (! is_string($channel)) {
                continue;
            }

            $responses[$channel] = $this->channelResponse($channel, $cursor, $userId);
        }

        return $responses;
    }

    /**
     * @return array<string, mixed>
     */
    private function channelResponse(string $channel, mixed $cursor, int $userId): array
    {
        if (! $this->canListen($channel, $userId)) {
            return [
                'events' => [],
                'cursor' => 0,
                'error'  => $this->serializeError(ErrorCode::BroadcastChannelForbidden->error(
                    __('You are not allowed to listen to this channel.', 'helm'),
                    ['status' => ErrorCode::BroadcastChannelForbidden->httpStatus()],
                )),
            ];
        }

        if (! is_numeric($cursor)) {
            return [
                'events' => [],
                'cursor' => $this->events->latestCursorForChannel($channel),
            ];
        }

        $cursor = max(0, (int) $cursor);
        $events = $this->events->findAfterCursorForChannel($channel, $cursor);
        $nextCursor = $cursor;

        foreach ($events as $event) {
            $nextCursor = max($nextCursor, $event->id ?? 0);
        }

        return [
            'events' => array_map([$this, 'serialize'], $events),
            'cursor' => $nextCursor,
        ];
    }

    private function canListen(string $channel, int $userId): bool
    {
        if (! preg_match('/^private-ship\.(\d+)$/', $channel, $matches)) {
            return false;
        }

        $ship = ShipPost::fromId((int) $matches[1]);
        return $ship !== null && $ship->ownerId() === $userId;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeError(WP_Error $error): array
    {
        return rest_convert_error_to_response($error)->get_data();
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(Event $event): array
    {
        return [
            'id'            => $event->id,
            'channel'       => $event->channel,
            'type'          => $event->type->value,
            'payload'       => $event->payload,
            'resource_type' => $event->resource_type,
            'resource_id'   => $event->resource_id,
            'created_at'    => $event->created_at->format('c'),
        ];
    }
}
