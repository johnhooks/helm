<?php

declare(strict_types=1);

namespace Tests\Wpunit\Navigation;

use Helm\Celestials\CelestialRepository;
use Helm\Celestials\CelestialType;
use Helm\Navigation\NodeRepository;
use Helm\Navigation\Provider as NavigationProvider;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * Tests for binary/multi-star system node grouping.
 *
 * Binary stars within 0.2 ly should share a single navigation node,
 * with multiple stars linked via the celestials table.
 *
 * @covers \Helm\Navigation\Provider
 * @property WpunitTester $tester
 */
class BinaryStarGroupingTest extends WPTestCase
{
    private NodeRepository $nodeRepository;
    private CelestialRepository $celestialRepository;

    public function _before(): void
    {
        parent::_before();

        $this->nodeRepository = helm(NodeRepository::class);
        $this->celestialRepository = helm(CelestialRepository::class);
    }

    public function test_single_star_creates_own_node(): void
    {
        $starPost = $this->tester->haveStar([
            'id' => 'SINGLE_STAR',
            'ra' => 0.0,
            'dec' => 0.0,
            'distanceLy' => 10.0,
        ]);

        $node = $this->tester->getNodeForStar($starPost);

        $this->assertNotNull($node);
        $this->assertTrue($node->isSystem());
    }

    public function test_single_star_has_celestial_link(): void
    {
        $starPost = $this->tester->haveStar([
            'id' => 'SINGLE_STAR_CELESTIAL',
            'ra' => 15.0,
            'dec' => 15.0,
            'distanceLy' => 20.0,
        ]);

        $celestial = $this->celestialRepository->findByContent(
            CelestialType::Star,
            $starPost->postId()
        );

        $this->assertNotNull($celestial);
        $this->assertSame(CelestialType::Star, $celestial->type);
    }

    public function test_star_without_system_id_creates_own_node(): void
    {
        // Two stars at similar positions but no system_id
        $star1 = $this->tester->haveStar([
            'id' => 'NO_SYSTEM_1',
            'ra' => 45.0,
            'dec' => 30.0,
            'distanceLy' => 5.0,
            'properties' => [], // No system_id
        ]);

        $star2 = $this->tester->haveStar([
            'id' => 'NO_SYSTEM_2',
            'ra' => 45.001, // Very close
            'dec' => 30.001,
            'distanceLy' => 5.0,
            'properties' => [], // No system_id
        ]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        // Each star should have its own node
        $this->assertNotNull($node1);
        $this->assertNotNull($node2);
        $this->assertNotSame($node1->id, $node2->id);
    }

    public function test_binary_stars_within_threshold_share_node(): void
    {
        // First star in binary system
        $star1 = $this->tester->haveStar([
            'id' => 'BINARY_A',
            'ra' => 0.0,
            'dec' => 0.0,
            'distanceLy' => 10.0,
            'properties' => ['system_id' => 'BINARY_SYSTEM_1'],
        ]);

        // Second star - same system, very close (within 0.2 ly)
        // At 10 ly distance, a small RA difference gives small 3D distance
        $star2 = $this->tester->haveStar([
            'id' => 'BINARY_B',
            'ra' => 0.001, // ~0.0001 ly difference at 10 ly distance
            'dec' => 0.0,
            'distanceLy' => 10.0,
            'properties' => ['system_id' => 'BINARY_SYSTEM_1'],
        ]);

        // First star should have a node
        $node1 = $this->tester->getNodeForStar($star1);
        $this->assertNotNull($node1);

        // Both stars should be linked to the same node via celestials
        $celestial1 = $this->celestialRepository->findByContent(CelestialType::Star, $star1->postId());
        $celestial2 = $this->celestialRepository->findByContent(CelestialType::Star, $star2->postId());

        $this->assertNotNull($celestial1);
        $this->assertNotNull($celestial2);
        $this->assertSame($celestial1->nodeId, $celestial2->nodeId);
        $this->assertSame($node1->id, $celestial1->nodeId);
    }

    public function test_binary_stars_beyond_threshold_get_separate_nodes(): void
    {
        // First star in wide binary system
        $star1 = $this->tester->haveStar([
            'id' => 'WIDE_BINARY_A',
            'ra' => 0.0,
            'dec' => 0.0,
            'distanceLy' => 1.0, // Close to Sol for easy calculation
            'properties' => ['system_id' => 'WIDE_BINARY_SYSTEM'],
        ]);

        // Second star - same system but far apart (> 0.2 ly)
        // At 1 ly distance, RA=90 means we're 1 ly away in Y direction
        // Combined with different distance, this creates > 0.2 ly separation
        $star2 = $this->tester->haveStar([
            'id' => 'WIDE_BINARY_B',
            'ra' => 90.0, // Perpendicular direction
            'dec' => 0.0,
            'distanceLy' => 1.0,
            'properties' => ['system_id' => 'WIDE_BINARY_SYSTEM'],
        ]);

        // Each star should have its own node
        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $this->assertNotNull($node1);
        $this->assertNotNull($node2);
        $this->assertNotSame($node1->id, $node2->id);

        // Calculate actual distance to verify
        $distance = sqrt(
            ($node1->x - $node2->x) ** 2 +
            ($node1->y - $node2->y) ** 2 +
            ($node1->z - $node2->z) ** 2
        );
        $this->assertGreaterThan(
            NavigationProvider::BINARY_GROUPING_THRESHOLD_LY,
            $distance
        );
    }

    public function test_triple_star_system_shares_single_node(): void
    {
        $systemId = 'TRIPLE_SYSTEM';

        // Primary star
        $star1 = $this->tester->haveStar([
            'id' => 'TRIPLE_A',
            'ra' => 100.0,
            'dec' => 45.0,
            'distanceLy' => 15.0,
            'properties' => ['system_id' => $systemId, 'is_primary' => true],
        ]);

        // Secondary - close to primary
        $star2 = $this->tester->haveStar([
            'id' => 'TRIPLE_B',
            'ra' => 100.0001,
            'dec' => 45.0,
            'distanceLy' => 15.0,
            'properties' => ['system_id' => $systemId],
        ]);

        // Tertiary - also close
        $star3 = $this->tester->haveStar([
            'id' => 'TRIPLE_C',
            'ra' => 100.0002,
            'dec' => 45.0001,
            'distanceLy' => 15.0,
            'properties' => ['system_id' => $systemId],
        ]);

        // Only primary should have its own node
        $node1 = $this->tester->getNodeForStar($star1);
        $this->assertNotNull($node1);

        // All three stars should be linked to the same node
        $celestials = $this->celestialRepository->findByNodeId($node1->id);
        $this->assertCount(3, $celestials);

        $linkedStarIds = array_map(fn($c) => $c->contentId, $celestials);
        $this->assertContains($star1->postId(), $linkedStarIds);
        $this->assertContains($star2->postId(), $linkedStarIds);
        $this->assertContains($star3->postId(), $linkedStarIds);
    }

    public function test_node_celestials_endpoint_returns_multiple_stars(): void
    {
        $systemId = 'ENDPOINT_TEST_SYSTEM';

        $star1 = $this->tester->haveStar([
            'id' => 'ENDPOINT_STAR_A',
            'name' => 'Alpha',
            'ra' => 200.0,
            'dec' => -30.0,
            'distanceLy' => 25.0,
            'properties' => ['system_id' => $systemId],
        ]);

        $star2 = $this->tester->haveStar([
            'id' => 'ENDPOINT_STAR_B',
            'name' => 'Beta',
            'ra' => 200.0001,
            'dec' => -30.0,
            'distanceLy' => 25.0,
            'properties' => ['system_id' => $systemId],
        ]);

        $node = $this->tester->getNodeForStar($star1);
        $celestials = $this->celestialRepository->findByNodeIdAndType($node->id, CelestialType::Star);

        $this->assertCount(2, $celestials);
    }

    public function test_grouping_threshold_constant_is_correct(): void
    {
        $this->assertSame(0.2, NavigationProvider::BINARY_GROUPING_THRESHOLD_LY);
    }
}
