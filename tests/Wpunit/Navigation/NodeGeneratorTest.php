<?php

declare(strict_types=1);

namespace Tests\Wpunit\Navigation;

use Helm\Navigation\Node;
use Helm\Navigation\NodeGenerator;
use Helm\Origin\Origin;
use tad\Codeception\SnapshotAssertions\SnapshotAssertions;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Navigation\NodeGenerator
 */
class NodeGeneratorTest extends \Codeception\Test\Unit
{
    use SnapshotAssertions;

    protected WpunitTester $tester;

    private Origin $origin;
    private NodeGenerator $generator;

    public function _before(): void
    {
        parent::_before();

        $this->origin = helm(Origin::class);

        // Reset and initialize with fixed seed for deterministic tests
        $this->origin->reset();
        $this->origin->initialize('test-origin', 'fixed-test-seed-for-snapshots');

        $this->generator = helm(NodeGenerator::class);
    }

    public function _after(): void
    {
        $this->origin->reset();
        parent::_after();
    }

    // ========================================
    // Snapshot Tests - Determinism Verification
    // ========================================

    public function test_waypoint_between_sol_and_nearby_star_is_deterministic(): void
    {
        $sol = $this->createNode(1, 0.0, 0.0, 0.0);
        $proximaCentauri = $this->createNode(2, 1.5, 2.8, -1.2);

        $waypoint = $this->generator->computeWaypoint($sol, $proximaCentauri);

        $this->assertMatchesJsonSnapshot(json_encode([
            'x' => round($waypoint['x'], 8),
            'y' => round($waypoint['y'], 8),
            'z' => round($waypoint['z'], 8),
            'hash' => $waypoint['hash'],
        ], JSON_PRETTY_PRINT));
    }

    public function test_waypoint_between_distant_stars_is_deterministic(): void
    {
        $sol = $this->createNode(1, 0.0, 0.0, 0.0);
        $tauCeti = $this->createNode(42, 8.5, -6.2, 4.1);

        $waypoint = $this->generator->computeWaypoint($sol, $tauCeti);

        $this->assertMatchesJsonSnapshot(json_encode([
            'x' => round($waypoint['x'], 8),
            'y' => round($waypoint['y'], 8),
            'z' => round($waypoint['z'], 8),
            'hash' => $waypoint['hash'],
        ], JSON_PRETTY_PRINT));
    }

    public function test_waypoint_is_same_regardless_of_direction(): void
    {
        $nodeA = $this->createNode(5, 3.0, 4.0, 0.0);
        $nodeB = $this->createNode(10, 9.0, 12.0, 5.0);

        $waypointAtoB = $this->generator->computeWaypoint($nodeA, $nodeB);
        $waypointBtoA = $this->generator->computeWaypoint($nodeB, $nodeA);

        // Hash should be identical regardless of direction
        $this->assertEquals($waypointAtoB['hash'], $waypointBtoA['hash']);

        // Coordinates may differ slightly due to progress direction, but hash is same
        $this->assertMatchesJsonSnapshot(json_encode([
            'a_to_b' => [
                'x' => round($waypointAtoB['x'], 8),
                'y' => round($waypointAtoB['y'], 8),
                'z' => round($waypointAtoB['z'], 8),
                'hash' => $waypointAtoB['hash'],
            ],
            'b_to_a' => [
                'x' => round($waypointBtoA['x'], 8),
                'y' => round($waypointBtoA['y'], 8),
                'z' => round($waypointBtoA['z'], 8),
                'hash' => $waypointBtoA['hash'],
            ],
        ], JSON_PRETTY_PRINT));
    }

    public function test_corridor_seed_is_deterministic(): void
    {
        $seeds = [
            'corridor_1_2' => $this->generator->corridorSeed(1, 2),
            'corridor_2_1' => $this->generator->corridorSeed(2, 1), // Same as above
            'corridor_1_42' => $this->generator->corridorSeed(1, 42),
            'corridor_5_10' => $this->generator->corridorSeed(5, 10),
        ];

        $this->assertMatchesJsonSnapshot(json_encode($seeds, JSON_PRETTY_PRINT));
    }

    public function test_waypoint_hash_is_deterministic(): void
    {
        $hashes = [
            'wp_1_2_idx0' => $this->generator->waypointHash(1, 2, 0),
            'wp_1_2_idx1' => $this->generator->waypointHash(1, 2, 1),
            'wp_2_1_idx0' => $this->generator->waypointHash(2, 1, 0), // Same as 1,2,0
            'wp_1_42_idx0' => $this->generator->waypointHash(1, 42, 0),
        ];

        // 1,2 and 2,1 should produce same hash
        $this->assertEquals($hashes['wp_1_2_idx0'], $hashes['wp_2_1_idx0']);

        $this->assertMatchesJsonSnapshot(json_encode($hashes, JSON_PRETTY_PRINT));
    }

    public function test_corridor_difficulty_is_deterministic(): void
    {
        $sol = $this->createNode(1, 0.0, 0.0, 0.0);
        $proximaCentauri = $this->createNode(2, 1.5, 2.8, -1.2);
        $tauCeti = $this->createNode(42, 8.5, -6.2, 4.1);

        $difficulties = [
            'sol_to_proxima' => round($this->generator->corridorDifficulty($sol, $proximaCentauri), 8),
            'sol_to_tau_ceti' => round($this->generator->corridorDifficulty($sol, $tauCeti), 8),
            'proxima_to_tau_ceti' => round($this->generator->corridorDifficulty($proximaCentauri, $tauCeti), 8),
        ];

        $this->assertMatchesJsonSnapshot(json_encode($difficulties, JSON_PRETTY_PRINT));
    }

    // ========================================
    // Behavioral Tests
    // ========================================

    public function test_waypoint_is_between_source_and_destination(): void
    {
        $from = $this->createNode(1, 0.0, 0.0, 0.0);
        $to = $this->createNode(2, 10.0, 0.0, 0.0);

        $waypoint = $this->generator->computeWaypoint($from, $to);

        // Waypoint should be between 0 and 10 on X axis (allowing for scatter)
        $this->assertGreaterThan(-2.0, $waypoint['x']);
        $this->assertLessThan(12.0, $waypoint['x']);
    }

    public function test_can_direct_jump_returns_true_for_close_nodes(): void
    {
        $from = $this->createNode(1, 0.0, 0.0, 0.0);
        $to = $this->createNode(2, 0.5, 0.0, 0.0); // 0.5 ly away

        $this->assertTrue($this->generator->canDirectJump($from, $to));
    }

    public function test_can_direct_jump_returns_false_beyond_max_range(): void
    {
        $from = $this->createNode(1, 0.0, 0.0, 0.0);
        $to = $this->createNode(2, 20.0, 0.0, 0.0); // 20 ly away, beyond 15 ly max

        $this->assertFalse($this->generator->canDirectJump($from, $to));
    }

    public function test_corridor_difficulty_is_bounded(): void
    {
        // Test many corridors to ensure difficulty is always 0.0-1.0
        for ($i = 1; $i <= 20; $i++) {
            for ($j = $i + 1; $j <= 20; $j++) {
                $nodeA = $this->createNode($i, (float)$i, (float)$j, 0.0);
                $nodeB = $this->createNode($j, (float)$j, (float)$i, 0.0);

                $difficulty = $this->generator->corridorDifficulty($nodeA, $nodeB);

                $this->assertGreaterThanOrEqual(0.0, $difficulty);
                $this->assertLessThanOrEqual(1.0, $difficulty);
            }
        }
    }

    public function test_different_corridors_have_different_seeds(): void
    {
        $seed12 = $this->generator->corridorSeed(1, 2);
        $seed13 = $this->generator->corridorSeed(1, 3);
        $seed23 = $this->generator->corridorSeed(2, 3);

        $this->assertNotEquals($seed12, $seed13);
        $this->assertNotEquals($seed12, $seed23);
        $this->assertNotEquals($seed13, $seed23);
    }

    public function test_waypoint_has_valid_hash(): void
    {
        $from = $this->createNode(1, 0.0, 0.0, 0.0);
        $to = $this->createNode(2, 5.0, 5.0, 5.0);

        $waypoint = $this->generator->computeWaypoint($from, $to);

        $this->assertNotEmpty($waypoint['hash']);
        $this->assertEquals(64, strlen($waypoint['hash'])); // SHA256 hex length
    }

    // ========================================
    // Helpers
    // ========================================

    private function createNode(int $id, float $x, float $y, float $z): Node
    {
        return new Node(
            id: $id,
            x: $x,
            y: $y,
            z: $z,
        );
    }
}
