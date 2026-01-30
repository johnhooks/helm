<?php

declare(strict_types=1);

namespace Helm\Navigation;

use Helm\Origin\Origin;

/**
 * Deterministic waypoint generator.
 *
 * This is the PURE layer - given two nodes, it always produces
 * the same waypoint position. No randomness, no gameplay factors.
 *
 * The waypoint for Sol↔TauCeti is ALWAYS at the same coordinates,
 * regardless of who scans it or when.
 */
final class NodeGenerator
{
    public const ALGORITHM_VERSION = 1;

    /**
     * Maximum perpendicular scatter as fraction of distance.
     * 0.1 means up to 10% of the total distance off the direct line.
     */
    private const MAX_SCATTER = 0.1;

    public function __construct(
        private readonly Origin $origin,
    ) {
    }

    /**
     * Compute the next waypoint between two nodes.
     *
     * This is DETERMINISTIC - same from/to always produces same result.
     * The waypoint is placed partway along the path with some scatter.
     *
     * @param Node $from Starting node
     * @param Node $to   Destination node
     * @return array{x: float, y: float, z: float, hash: string} Waypoint data
     */
    public function computeWaypoint(Node $from, Node $to): array
    {
        $seed = $this->corridorSeed($from->id, $to->id);

        // Deterministic "random" values from seed
        $progress = $this->seededFloat($seed, 'progress', 0.3, 0.6);
        $scatterX = $this->seededFloat($seed, 'scatter_x', -self::MAX_SCATTER, self::MAX_SCATTER);
        $scatterY = $this->seededFloat($seed, 'scatter_y', -self::MAX_SCATTER, self::MAX_SCATTER);
        $scatterZ = $this->seededFloat($seed, 'scatter_z', -self::MAX_SCATTER, self::MAX_SCATTER);

        // Calculate position along the direct path
        $dx = $to->x - $from->x;
        $dy = $to->y - $from->y;
        $dz = $to->z - $from->z;
        $distance = $from->distanceTo($to);

        // Base position: progress along the path
        $x = $from->x + ($dx * $progress);
        $y = $from->y + ($dy * $progress);
        $z = $from->z + ($dz * $progress);

        // Add perpendicular scatter (scaled by distance)
        $x += $scatterX * $distance;
        $y += $scatterY * $distance;
        $z += $scatterZ * $distance;

        // Generate deterministic hash for this waypoint
        $hash = $this->waypointHash($from->id, $to->id, 0);

        return [
            'x' => $x,
            'y' => $y,
            'z' => $z,
            'hash' => $hash,
        ];
    }

    /**
     * Check if two nodes are close enough for a direct jump.
     *
     * This is also deterministic - based on the corridor seed.
     * Closer nodes have higher chance of direct jump.
     *
     * @param Node  $from     Starting node
     * @param Node  $to       Destination node
     * @param float $maxRange Maximum jump range in light years
     * @return bool True if direct jump is possible
     */
    public function canDirectJump(Node $from, Node $to, float $maxRange = 7.0): bool
    {
        $distance = $from->distanceTo($to);

        // Beyond max range: never direct
        if ($distance > $maxRange) {
            return false;
        }

        // Very close: always direct
        if ($distance < 1.0) {
            return true;
        }

        // Deterministic threshold based on corridor
        $seed = $this->corridorSeed($from->id, $to->id);
        $threshold = $this->seededFloat($seed, 'direct', 0.0, 1.0);

        // Distance ratio affects difficulty (closer = easier)
        $distanceRatio = $distance / $maxRange;
        $difficulty = pow($distanceRatio, 1.5); // Exponential curve

        return $threshold > $difficulty;
    }

    /**
     * Get the difficulty value for a node pair.
     *
     * This is the deterministic "fluctuation" - each corridor has
     * its own inherent difficulty based on the node IDs.
     *
     * @return float 0.0-1.0, higher = more difficult
     */
    public function corridorDifficulty(Node $from, Node $to): float
    {
        $seed = $this->corridorSeed($from->id, $to->id);
        return $this->seededFloat($seed, 'difficulty', 0.0, 1.0);
    }

    /**
     * Generate the corridor seed for two nodes.
     *
     * Always uses min/max ordering so A→B and B→A produce same seed.
     */
    public function corridorSeed(int $nodeAId, int $nodeBId): string
    {
        $minId = min($nodeAId, $nodeBId);
        $maxId = max($nodeAId, $nodeBId);
        $corridorKey = "{$minId}-{$maxId}";

        return hash(
            'sha256',
            $this->origin->config()->masterSeed .
            ':nav:' .
            $corridorKey .
            ':v' . self::ALGORITHM_VERSION
        );
    }

    /**
     * Generate the hash for a waypoint in a corridor.
     *
     * @param int $nodeAId      First node ID
     * @param int $nodeBId      Second node ID
     * @param int $waypointIndex Index of waypoint in this corridor (usually 0)
     */
    public function waypointHash(int $nodeAId, int $nodeBId, int $waypointIndex = 0): string
    {
        $corridorSeed = $this->corridorSeed($nodeAId, $nodeBId);

        return hash(
            'sha256',
            $corridorSeed . ':wp:' . $waypointIndex
        );
    }

    /**
     * Get a deterministic float from a seed.
     *
     * @param string $seed    Base seed
     * @param string $key     Unique key for this value
     * @param float  $min     Minimum value
     * @param float  $max     Maximum value
     * @return float Deterministic value in range [min, max]
     */
    private function seededFloat(string $seed, string $key, float $min, float $max): float
    {
        $hash = hash('sha256', $seed . ':' . $key);
        // Use first 8 hex chars (32 bits) for the float
        $intValue = hexdec(substr($hash, 0, 8));
        $normalized = $intValue / 0xFFFFFFFF; // 0.0 to 1.0

        return $min + ($normalized * ($max - $min));
    }
}
