<?php

declare(strict_types=1);

namespace Tests\Wpunit\Navigation;

use Helm\Database\Schema;
use Helm\Navigation\Node;
use Helm\Navigation\NodeRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\Navigation\NodeRepository
 * @covers \Helm\Navigation\Node
 */
class NodeRepositoryTest extends WPTestCase
{
    private NodeRepository $repository;

    public function _before(): void
    {
        parent::_before();

        $this->repository = helm(NodeRepository::class);

        // Ensure tables exist
        if (! Schema::tablesExist()) {
            Schema::createTables();
        }
    }

    public function test_can_create_star_node(): void
    {
        $starPostId = $this->factory()->post->create(['post_type' => 'helm_star']);

        $node = $this->repository->create(
            x: 1.5,
            y: 2.5,
            z: 3.5,
            starPostId: $starPostId,
        );

        $this->assertInstanceOf(Node::class, $node);
        $this->assertGreaterThan(0, $node->id);
        $this->assertSame($starPostId, $node->starPostId);
        $this->assertSame(1.5, $node->x);
        $this->assertSame(2.5, $node->y);
        $this->assertSame(3.5, $node->z);
        $this->assertTrue($node->isStar());
        $this->assertFalse($node->isWaypoint());
    }

    public function test_can_create_waypoint_node(): void
    {
        $node = $this->repository->create(
            x: 10.0,
            y: 20.0,
            z: 30.0,
            hash: 'waypoint_hash_123',
        );

        $this->assertInstanceOf(Node::class, $node);
        $this->assertGreaterThan(0, $node->id);
        $this->assertNull($node->starPostId);
        $this->assertSame('waypoint_hash_123', $node->hash);
        $this->assertFalse($node->isStar());
        $this->assertTrue($node->isWaypoint());
    }

    public function test_can_get_node_by_id(): void
    {
        $starPostId = $this->factory()->post->create(['post_type' => 'helm_star']);
        $created = $this->repository->create(1.0, 2.0, 3.0, starPostId: $starPostId);

        $fetched = $this->repository->get($created->id);

        $this->assertNotNull($fetched);
        $this->assertSame($created->id, $fetched->id);
        $this->assertSame($starPostId, $fetched->starPostId);
    }

    public function test_get_returns_null_for_unknown_id(): void
    {
        $result = $this->repository->get(99999);

        $this->assertNull($result);
    }

    public function test_can_get_node_by_star_post_id(): void
    {
        $starPostId = $this->factory()->post->create(['post_type' => 'helm_star']);
        $this->repository->create(1.0, 2.0, 3.0, starPostId: $starPostId);

        $fetched = $this->repository->getByStarPostId($starPostId);

        $this->assertNotNull($fetched);
        $this->assertSame($starPostId, $fetched->starPostId);
    }

    public function test_can_get_waypoint_by_hash(): void
    {
        $this->repository->create(1.0, 2.0, 3.0, hash: 'unique_hash_456');

        $fetched = $this->repository->getByHash('unique_hash_456');

        $this->assertNotNull($fetched);
        $this->assertSame('unique_hash_456', $fetched->hash);
    }

    public function test_create_waypoint_returns_existing_if_hash_exists(): void
    {
        $first = $this->repository->create(1.0, 2.0, 3.0, hash: 'duplicate_hash');
        $second = $this->repository->create(99.0, 99.0, 99.0, hash: 'duplicate_hash');

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1.0, $second->x); // Original coords preserved
    }

    public function test_all_stars_returns_only_star_nodes(): void
    {
        $starPostId1 = $this->factory()->post->create(['post_type' => 'helm_star']);
        $starPostId2 = $this->factory()->post->create(['post_type' => 'helm_star']);

        $this->repository->create(1.0, 0.0, 0.0, starPostId: $starPostId1);
        $this->repository->create(2.0, 0.0, 0.0, starPostId: $starPostId2);
        $this->repository->create(3.0, 0.0, 0.0, hash: 'waypoint_hash');

        $stars = $this->repository->allStars();

        $this->assertCount(2, $stars);
        $this->assertTrue($stars[0]->isStar());
        $this->assertTrue($stars[1]->isStar());
    }

    public function test_within_distance_finds_nearby_nodes(): void
    {
        $starPostId1 = $this->factory()->post->create(['post_type' => 'helm_star']);
        $starPostId2 = $this->factory()->post->create(['post_type' => 'helm_star']);
        $starPostId3 = $this->factory()->post->create(['post_type' => 'helm_star']);

        // Origin
        $this->repository->create(0.0, 0.0, 0.0, starPostId: $starPostId1);
        // Close (distance = 5)
        $this->repository->create(3.0, 4.0, 0.0, starPostId: $starPostId2);
        // Far (distance = 15)
        $this->repository->create(9.0, 12.0, 0.0, starPostId: $starPostId3);

        $nearby = $this->repository->withinDistance(0.0, 0.0, 0.0, 10.0);

        $this->assertCount(2, $nearby);
    }

    public function test_neighbors_of_excludes_source_node(): void
    {
        $starPostId1 = $this->factory()->post->create(['post_type' => 'helm_star']);
        $starPostId2 = $this->factory()->post->create(['post_type' => 'helm_star']);

        $origin = $this->repository->create(0.0, 0.0, 0.0, starPostId: $starPostId1);
        $this->repository->create(1.0, 0.0, 0.0, starPostId: $starPostId2);

        $neighbors = $this->repository->neighborsOf($origin, 10.0);

        $this->assertCount(1, $neighbors);
        $this->assertNotEquals($origin->id, array_values($neighbors)[0]->id);
    }

    public function test_can_delete_node(): void
    {
        $starPostId = $this->factory()->post->create(['post_type' => 'helm_star']);
        $node = $this->repository->create(1.0, 2.0, 3.0, starPostId: $starPostId);

        $result = $this->repository->delete($node->id);

        $this->assertTrue($result);
        $this->assertNull($this->repository->get($node->id));
    }

    public function test_count_returns_correct_totals(): void
    {
        $starPostId1 = $this->factory()->post->create(['post_type' => 'helm_star']);
        $starPostId2 = $this->factory()->post->create(['post_type' => 'helm_star']);

        $this->repository->create(1.0, 0.0, 0.0, starPostId: $starPostId1);
        $this->repository->create(2.0, 0.0, 0.0, starPostId: $starPostId2);
        $this->repository->create(3.0, 0.0, 0.0, hash: 'wp_hash');

        $this->assertSame(3, $this->repository->count());
        $this->assertSame(2, $this->repository->countStars());
        $this->assertSame(1, $this->repository->countWaypoints());
    }

    public function test_node_distance_to_calculates_correctly(): void
    {
        $node1 = new Node(id: 1, x: 0.0, y: 0.0, z: 0.0);
        $node2 = new Node(id: 2, x: 3.0, y: 4.0, z: 0.0);

        $distance = $node1->distanceTo($node2);

        $this->assertSame(5.0, $distance);
    }

    public function test_node_coordinates_returns_array(): void
    {
        $node = new Node(id: 1, x: 1.5, y: 2.5, z: 3.5);

        $coords = $node->coordinates();

        $this->assertSame([1.5, 2.5, 3.5], $coords);
    }

    public function test_save_updates_existing_node(): void
    {
        $starPostId = $this->factory()->post->create(['post_type' => 'helm_star']);
        $original = $this->repository->create(1.0, 2.0, 3.0, starPostId: $starPostId);

        // Create updated node with same ID
        $updated = new Node(
            id: $original->id,
            x: 10.0,
            y: 20.0,
            z: 30.0,
            starPostId: $starPostId,
        );

        $saved = $this->repository->save($updated);

        $this->assertSame($original->id, $saved->id);
        $this->assertSame(10.0, $saved->x);
        $this->assertSame(20.0, $saved->y);
        $this->assertSame(30.0, $saved->z);
    }

    public function test_get_by_star_post_id_returns_null_for_unknown(): void
    {
        $result = $this->repository->getByStarPostId(99999);

        $this->assertNull($result);
    }

    public function test_get_by_hash_returns_null_for_unknown(): void
    {
        $result = $this->repository->getByHash('nonexistent_hash');

        $this->assertNull($result);
    }

    public function test_node_from_row_handles_null_star_post_id(): void
    {
        $row = [
            'id' => 1,
            'x' => 1.0,
            'y' => 2.0,
            'z' => 3.0,
            'star_post_id' => null,
            'hash' => 'test_hash',
            'algorithm_version' => 1,
            'created_at' => '2024-01-01 00:00:00',
        ];

        $node = Node::fromRow($row);

        $this->assertNull($node->starPostId);
        $this->assertTrue($node->isWaypoint());
    }

    public function test_node_to_row_returns_correct_array(): void
    {
        $node = new Node(
            id: 1,
            x: 1.5,
            y: 2.5,
            z: 3.5,
            starPostId: 100,
            hash: null,
            algorithmVersion: 2,
        );

        $row = $node->toRow();

        $this->assertSame(100, $row['star_post_id']);
        $this->assertSame(1.5, $row['x']);
        $this->assertSame(2.5, $row['y']);
        $this->assertSame(3.5, $row['z']);
        $this->assertNull($row['hash']);
        $this->assertSame(2, $row['algorithm_version']);
    }
}
