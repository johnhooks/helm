<?php

declare(strict_types=1);

namespace Helm\Simulation;

use Helm\Lib\Date;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Navigation\Node;
use Helm\Navigation\NodeType;

/**
 * In-memory node repository for simulation.
 */
final class MemoryNodeRepository implements NodeRepository
{
    /** @var array<int, Node> Indexed by node ID */
    private array $nodes = [];

    private int $nextId = 1;

    public function get(int $id): ?Node
    {
        return $this->nodes[$id] ?? null;
    }

    public function getMany(array $ids): array
    {
        $result = [];

        foreach ($ids as $id) {
            if (isset($this->nodes[$id])) {
                $result[$id] = $this->nodes[$id];
            }
        }

        return $result;
    }

    public function paginate(?NodeType $type = null, int $page = 1, int $perPage = 100): array
    {
        throw new \BadMethodCallException('MemoryNodeRepository::paginate() is not implemented.');
    }

    public function getByHash(string $hash): ?Node
    {
        foreach ($this->nodes as $node) {
            if ($node->hash === $hash) {
                return $node;
            }
        }

        return null;
    }

    public function allSystems(): array
    {
        throw new \BadMethodCallException('MemoryNodeRepository::allSystems() is not implemented.');
    }

    public function withinDistance(float $x, float $y, float $z, float $maxDistance): array
    {
        $origin = new Node(id: 0, x: $x, y: $y, z: $z);

        return array_values(array_filter(
            $this->nodes,
            static fn (Node $node) => $origin->distanceTo($node) <= $maxDistance,
        ));
    }

    public function neighborsOf(Node $node, float $maxDistance): array
    {
        return array_values(array_filter(
            $this->nodes,
            static fn (Node $n) => $n->id !== $node->id && $node->distanceTo($n) <= $maxDistance,
        ));
    }

    public function save(Node $node): Node
    {
        if ($node->id === 0) {
            return $this->create(
                $node->x,
                $node->y,
                $node->z,
                $node->type,
                $node->hash,
                $node->algorithmVersion,
            );
        }

        $this->nodes[$node->id] = $node;

        return $node;
    }

    public function create(
        float $x,
        float $y,
        float $z,
        NodeType $type = NodeType::Waypoint,
        ?string $hash = null,
        int $algorithmVersion = 1,
    ): Node {
        $id = $this->nextId++;

        $node = new Node(
            id: $id,
            x: $x,
            y: $y,
            z: $z,
            type: $type,
            hash: $hash,
            algorithmVersion: $algorithmVersion,
            createdAt: Date::nowString(),
        );

        $this->nodes[$id] = $node;

        return $node;
    }

    public function delete(int $id): bool
    {
        if (!isset($this->nodes[$id])) {
            return false;
        }

        unset($this->nodes[$id]);

        return true;
    }

    public function count(): int
    {
        return count($this->nodes);
    }

    public function countSystems(): int
    {
        throw new \BadMethodCallException('MemoryNodeRepository::countSystems() is not implemented.');
    }

    public function countWaypoints(): int
    {
        throw new \BadMethodCallException('MemoryNodeRepository::countWaypoints() is not implemented.');
    }
}
