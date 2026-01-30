<?php

declare(strict_types=1);

namespace Helm\ShipLink;

/**
 * Represents an action to be processed by ShipLink.
 *
 * Actions carry intent and parameters. The type determines
 * how the action is processed.
 */
class Action
{
    /**
     * @param array<string, mixed> $params
     */
    public function __construct(
        public readonly ActionType $type,
        public readonly array $params = [],
    ) {
    }

    /**
     * Create a route scan action.
     */
    public static function scanRoute(int $targetNodeId, int $depth = 1): self
    {
        return new self(ActionType::ScanRoute, [
            'target_node_id' => $targetNodeId,
            'depth' => $depth,
        ]);
    }

    /**
     * Create a jump action.
     */
    public static function jump(int $targetNodeId): self
    {
        return new self(ActionType::Jump, [
            'target_node_id' => $targetNodeId,
        ]);
    }

    /**
     * Create a system survey action.
     */
    public static function survey(int $starId): self
    {
        return new self(ActionType::Survey, [
            'star_id' => $starId,
        ]);
    }

    /**
     * Create a planet scan action.
     */
    public static function scanPlanet(int $planetId): self
    {
        return new self(ActionType::ScanPlanet, [
            'planet_id' => $planetId,
        ]);
    }

    /**
     * Create a mining action.
     */
    public static function mine(int $nodeId, string $resource): self
    {
        return new self(ActionType::Mine, [
            'node_id' => $nodeId,
            'resource' => $resource,
        ]);
    }

    /**
     * Get a parameter value.
     */
    public function get(string $key, mixed $default = null): mixed
    {
        return $this->params[$key] ?? $default;
    }

    /**
     * Check if action requires time to complete (must be queued).
     */
    public function requiresTime(): bool
    {
        return $this->type->requiresTime();
    }
}
