<?php

declare(strict_types=1);

namespace Helm\Abilities\Support;

/** Shared output shapes used by multiple abilities. */
final class Schemas
{
    /**
     * @param array<string, mixed> $item
     * @return array<string, mixed>
     */
    public static function collection(string $key, array $item): array
    {
        return [
            'type' => 'object',
            'properties' => [
                $key => ['type' => 'array', 'items' => $item],
                'total' => ['type' => 'integer'], 'page' => ['type' => 'integer'],
                'has_more' => ['type' => 'boolean'],
            ],
            'required' => [$key, 'total', 'page', 'has_more'],
        ];
    }

    /** @return array<string, mixed> */
    public static function action(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'id' => ['type' => 'integer'], 'ship_post_id' => ['type' => 'integer'],
                'type' => ['type' => 'string'],
                'status' => ['type' => 'string', 'enum' => ['pending', 'running', 'fulfilled', 'partial', 'failed']],
                'params' => ['type' => 'object'], 'result' => ['type' => ['object', 'null']],
                'deferred_until' => ['type' => ['string', 'null']],
                'created_at' => ['type' => 'string'], 'updated_at' => ['type' => 'string'],
            ],
            'required' => ['id', 'ship_post_id', 'type', 'status', 'params', 'result', 'deferred_until', 'created_at', 'updated_at'],
            'additionalProperties' => false,
        ];
    }
}
