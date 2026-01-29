<?php

declare(strict_types=1);

namespace Tests\Wpunit\Stars;

use Helm\Database\Schema;
use Helm\Navigation\NodeRepository;
use Helm\Stars\Star;
use Helm\Stars\StarCatalog;
use Helm\Stars\StarPost;
use Helm\Stars\StarRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Stars\StarRepository
 * @covers \Helm\Stars\StarPost
 *
 * @property WpunitTester $tester
 */
class StarRepositoryTest extends WPTestCase
{
    private StarRepository $repository;
    private StarCatalog $catalog;

    public function _before(): void
    {
        parent::_before();
        $this->repository = helm(StarRepository::class);
        $this->catalog = helm(StarCatalog::class);
    }

    public function test_can_save_star(): void
    {
        $sol = $this->catalog->sol();

        $starPost = $this->repository->save($sol);

        $this->assertInstanceOf(StarPost::class, $starPost);
        $this->assertSame('SOL', $starPost->catalogId());
        $this->assertSame('Sol', $starPost->displayName());
    }

    public function test_can_get_star_by_catalog_id(): void
    {
        $starPost = $this->tester->haveStar(['id' => 'TEST_STAR_1']);

        $retrieved = $this->repository->get('TEST_STAR_1');

        $this->assertInstanceOf(StarPost::class, $retrieved);
        $this->assertSame('TEST_STAR_1', $retrieved->catalogId());
    }

    public function test_get_returns_null_for_unknown_id(): void
    {
        $starPost = $this->repository->get('UNKNOWN_STAR');

        $this->assertNull($starPost);
    }

    public function test_can_convert_star_post_to_star(): void
    {
        $original = $this->catalog->sol();
        $this->repository->save($original);

        $starPost = $this->repository->get('SOL');
        $star = $starPost->toStar();

        $this->assertInstanceOf(Star::class, $star);
        $this->assertSame($original->id, $star->id);
        $this->assertSame($original->name, $star->name);
        $this->assertSame($original->spectralType, $star->spectralType);
        $this->assertSame($original->distanceLy, $star->distanceLy);
    }

    public function test_save_updates_existing_star(): void
    {
        $sol = $this->catalog->sol();
        $firstPost = $this->repository->save($sol);
        $firstPostId = $firstPost->postId();

        // Save again
        $secondPost = $this->repository->save($sol);

        // Should be same post
        $this->assertSame($firstPostId, $secondPost->postId());
        $this->assertSame(1, $this->repository->count());
    }

    public function test_can_delete_star(): void
    {
        $this->tester->haveStar(['id' => 'DELETE_ME']);

        $result = $this->repository->delete('DELETE_ME');

        $this->assertTrue($result);
        $this->tester->dontSeeStarInDatabase('DELETE_ME');
    }

    public function test_delete_returns_false_for_unknown_id(): void
    {
        $result = $this->repository->delete('UNKNOWN_STAR');

        $this->assertFalse($result);
    }

    public function test_all_returns_all_stars(): void
    {
        $this->tester->haveStars(3, ['id' => 'BULK']);

        $all = $this->repository->all();

        $this->assertCount(3, $all);
        foreach ($all as $starPost) {
            $this->assertInstanceOf(StarPost::class, $starPost);
        }
    }

    public function test_in_range_filters_by_distance(): void
    {
        $this->tester->haveStar(['id' => 'NEAR', 'distanceLy' => 2.0]);
        $this->tester->haveStar(['id' => 'FAR', 'distanceLy' => 50.0]);

        $nearby = $this->repository->inRange(5.0);
        $all = $this->repository->inRange(100.0);

        $this->assertCount(1, $nearby);
        $this->assertSame('NEAR', $nearby[0]->catalogId());
        $this->assertCount(2, $all);
    }

    public function test_by_spectral_class_filters_correctly(): void
    {
        $this->tester->haveStar(['id' => 'G_STAR', 'spectralType' => 'G2V']);
        $this->tester->haveStar(['id' => 'A_STAR', 'spectralType' => 'A1V']);

        $gClass = $this->repository->bySpectralClass('G');
        $aClass = $this->repository->bySpectralClass('A');

        $this->assertCount(1, $gClass);
        $this->assertSame('G_STAR', $gClass[0]->catalogId());

        $this->assertCount(1, $aClass);
        $this->assertSame('A_STAR', $aClass[0]->catalogId());
    }

    public function test_count_returns_correct_number(): void
    {
        $this->assertSame(0, $this->repository->count());

        $this->tester->haveStar(['id' => 'COUNT_1']);
        $this->assertSame(1, $this->repository->count());

        $this->tester->haveStar(['id' => 'COUNT_2']);
        $this->assertSame(2, $this->repository->count());
    }

    public function test_exists_returns_correct_boolean(): void
    {
        $this->assertFalse($this->repository->exists('EXISTS_TEST'));

        $this->tester->haveStar(['id' => 'EXISTS_TEST']);

        $this->assertTrue($this->repository->exists('EXISTS_TEST'));
        $this->assertFalse($this->repository->exists('UNKNOWN'));
    }

    public function test_star_properties_are_preserved(): void
    {
        $starPost = $this->tester->haveStar([
            'id' => 'PROPS_TEST',
            'spectralType' => 'K5V',
            'distanceLy' => 12.5,
            'ra' => 45.6,
            'dec' => -12.3,
            'properties' => ['luminosity_solar' => 0.5],
        ]);

        $retrieved = $this->repository->get('PROPS_TEST');
        $star = $retrieved->toStar();

        $this->assertSame(45.6, $star->ra);
        $this->assertSame(-12.3, $star->dec);
        $this->assertSame(0.5, $star->luminosity());
    }

    // =========================================================================
    // Navigation Integration Tests
    // =========================================================================

    public function test_saving_star_creates_nav_node(): void
    {
        // Ensure tables exist
        if (! Schema::tablesExist()) {
            Schema::createTables();
        }

        $nodeRepository = helm(NodeRepository::class);

        // Create a star
        $starPost = $this->tester->haveStar([
            'id' => 'NAV_TEST_1',
            'distanceLy' => 10.0,
            'ra' => 45.0,
            'dec' => 30.0,
        ]);

        // Should have created a corresponding nav_node
        $node = $nodeRepository->getByStarPostId($starPost->postId());

        $this->assertNotNull($node, 'Nav node should be created when star is saved');
        $this->assertSame($starPost->postId(), $node->starPostId);
        $this->assertTrue($node->isStar());
    }

    public function test_nav_node_has_correct_coordinates(): void
    {
        if (! Schema::tablesExist()) {
            Schema::createTables();
        }

        $nodeRepository = helm(NodeRepository::class);

        // Star at RA=90°, Dec=0°, Distance=10 ly
        // Should be at (0, 10, 0)
        $starPost = $this->tester->haveStar([
            'id' => 'NAV_COORD_TEST',
            'distanceLy' => 10.0,
            'ra' => 90.0,
            'dec' => 0.0,
        ]);

        $node = $nodeRepository->getByStarPostId($starPost->postId());

        $this->assertNotNull($node);
        $this->assertEqualsWithDelta(0.0, $node->x, 0.0001);
        $this->assertEqualsWithDelta(10.0, $node->y, 0.0001);
        $this->assertEqualsWithDelta(0.0, $node->z, 0.0001);
    }

    public function test_sol_nav_node_is_at_origin(): void
    {
        if (! Schema::tablesExist()) {
            Schema::createTables();
        }

        $nodeRepository = helm(NodeRepository::class);

        $sol = $this->catalog->sol();
        $solPost = $this->repository->save($sol);

        $node = $nodeRepository->getByStarPostId($solPost->postId());

        $this->assertNotNull($node);
        $this->assertSame(0.0, $node->x);
        $this->assertSame(0.0, $node->y);
        $this->assertSame(0.0, $node->z);
    }

    public function test_saving_same_star_twice_does_not_duplicate_nav_node(): void
    {
        if (! Schema::tablesExist()) {
            Schema::createTables();
        }

        $nodeRepository = helm(NodeRepository::class);

        $star = new Star(
            id: 'NAV_DUP_TEST',
            name: null,
            spectralType: 'G2V',
            distanceLy: 5.0,
            ra: 0.0,
            dec: 0.0,
        );

        // Save twice
        $starPost1 = $this->repository->save($star);
        $starPost2 = $this->repository->save($star);

        // Should be same post
        $this->assertSame($starPost1->postId(), $starPost2->postId());

        // Should only have one nav_node
        $node1 = $nodeRepository->getByStarPostId($starPost1->postId());
        $node2 = $nodeRepository->getByStarPostId($starPost2->postId());

        $this->assertNotNull($node1);
        $this->assertSame($node1->id, $node2->id, 'Second save should not create duplicate nav_node');
    }

    public function test_multiple_stars_create_separate_nav_nodes(): void
    {
        if (! Schema::tablesExist()) {
            Schema::createTables();
        }

        $nodeRepository = helm(NodeRepository::class);

        $star1Post = $this->tester->haveStar([
            'id' => 'MULTI_NAV_1',
            'distanceLy' => 5.0,
            'ra' => 0.0,
            'dec' => 0.0,
        ]);

        $star2Post = $this->tester->haveStar([
            'id' => 'MULTI_NAV_2',
            'distanceLy' => 10.0,
            'ra' => 90.0,
            'dec' => 0.0,
        ]);

        $node1 = $nodeRepository->getByStarPostId($star1Post->postId());
        $node2 = $nodeRepository->getByStarPostId($star2Post->postId());

        $this->assertNotNull($node1);
        $this->assertNotNull($node2);
        $this->assertNotSame($node1->id, $node2->id);

        // Verify they have different coordinates
        $this->assertEqualsWithDelta(5.0, $node1->x, 0.0001);
        $this->assertEqualsWithDelta(0.0, $node2->x, 0.0001);
        $this->assertEqualsWithDelta(10.0, $node2->y, 0.0001);
    }
}
