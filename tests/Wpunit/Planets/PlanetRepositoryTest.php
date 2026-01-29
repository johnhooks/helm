<?php

declare(strict_types=1);

namespace Tests\Wpunit\Planets;

use Helm\Planets\Planet;
use Helm\Planets\PlanetPost;
use Helm\Planets\PlanetRepository;
use Helm\Stars\StarCatalog;
use Helm\Stars\StarRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Planets\PlanetRepository
 * @covers \Helm\Planets\PlanetPost
 * @covers \Helm\Planets\Planet
 *
 * @property WpunitTester $tester
 */
class PlanetRepositoryTest extends WPTestCase
{
    private PlanetRepository $repository;
    private StarRepository $starRepository;
    private StarCatalog $catalog;

    public function _before(): void
    {
        parent::_before();
        $this->repository = helm(PlanetRepository::class);
        $this->starRepository = helm(StarRepository::class);
        $this->catalog = helm(StarCatalog::class);
    }

    public function test_can_save_planet(): void
    {
        $starPost = $this->tester->haveStar(['id' => 'TEST_STAR']);

        $planetPost = $this->tester->havePlanet($starPost->postId(), [
            'id' => 'TEST_P1',
            'starId' => 'TEST_STAR',
        ]);

        $this->assertInstanceOf(PlanetPost::class, $planetPost);
        $this->assertSame('TEST_P1', $planetPost->planetId());
        $this->assertSame('TEST_STAR', $planetPost->starId());
    }

    public function test_planet_has_correct_parent(): void
    {
        $starPost = $this->tester->haveStar(['id' => 'TEST_STAR']);

        $planetPost = $this->tester->havePlanet($starPost->postId(), [
            'id' => 'TEST_P1',
            'starId' => 'TEST_STAR',
        ]);

        $this->assertSame($starPost->postId(), $planetPost->starPostId());
    }

    public function test_can_get_planet_by_id(): void
    {
        $starPost = $this->tester->haveStar(['id' => 'TEST_STAR']);
        $this->tester->havePlanet($starPost->postId(), [
            'id' => 'TEST_P1',
            'starId' => 'TEST_STAR',
        ]);

        $planetPost = $this->repository->get('TEST_P1');

        $this->assertInstanceOf(PlanetPost::class, $planetPost);
        $this->assertSame('TEST_P1', $planetPost->planetId());
    }

    public function test_get_returns_null_for_unknown_id(): void
    {
        $planetPost = $this->repository->get('UNKNOWN_PLANET');

        $this->assertNull($planetPost);
    }

    public function test_can_convert_planet_post_to_planet(): void
    {
        $starPost = $this->tester->haveStar(['id' => 'TEST_STAR']);
        $original = $this->tester->havePlanet($starPost->postId(), [
            'id' => 'TEST_P1',
            'starId' => 'TEST_STAR',
            'type' => Planet::TYPE_TERRESTRIAL,
            'orbitAu' => 1.5,
            'habitable' => true,
        ]);

        $planetPost = $this->repository->get('TEST_P1');
        $planet = $planetPost->toPlanet();

        $this->assertInstanceOf(Planet::class, $planet);
        $this->assertSame($original->planetId(), $planet->id);
        $this->assertSame('TEST_STAR', $planet->starId);
        $this->assertSame(Planet::TYPE_TERRESTRIAL, $planet->type);
        $this->assertSame(1.5, $planet->orbitAu);
        $this->assertTrue($planet->habitable);
    }

    public function test_can_get_planets_for_star(): void
    {
        $starPost = $this->tester->haveStar(['id' => 'TEST_STAR']);
        $this->tester->havePlanets($starPost->postId(), 3, [
            'id' => 'TEST_P',
            'starId' => 'TEST_STAR',
        ]);

        $planets = $this->repository->forStar('TEST_STAR');

        $this->assertCount(3, $planets);
        // Should be ordered by orbit index
        $this->assertSame('TEST_P0', $planets[0]->planetId());
        $this->assertSame('TEST_P1', $planets[1]->planetId());
        $this->assertSame('TEST_P2', $planets[2]->planetId());
    }

    public function test_for_star_returns_empty_for_unknown_star(): void
    {
        $planets = $this->repository->forStar('UNKNOWN');

        $this->assertEmpty($planets);
    }

    public function test_can_delete_planet(): void
    {
        $starPost = $this->tester->haveStar(['id' => 'TEST_STAR']);
        $this->tester->havePlanet($starPost->postId(), [
            'id' => 'DELETE_ME',
            'starId' => 'TEST_STAR',
        ]);

        $result = $this->repository->delete('DELETE_ME');

        $this->assertTrue($result);
        $this->assertNull($this->repository->get('DELETE_ME'));
    }

    public function test_can_get_habitable_planets(): void
    {
        $starPost = $this->tester->haveStar(['id' => 'TEST_STAR']);

        $this->tester->havePlanet($starPost->postId(), [
            'id' => 'EARTH_LIKE',
            'starId' => 'TEST_STAR',
            'type' => Planet::TYPE_TERRESTRIAL,
            'habitable' => true,
        ]);

        $this->tester->havePlanet($starPost->postId(), [
            'id' => 'GAS_GIANT',
            'starId' => 'TEST_STAR',
            'type' => Planet::TYPE_GAS_GIANT,
            'habitable' => false,
            'orbitIndex' => 1,
        ]);

        $habitablePlanets = $this->repository->habitable();

        $this->assertCount(1, $habitablePlanets);
        $this->assertSame('EARTH_LIKE', $habitablePlanets[0]->planetId());
    }

    public function test_can_get_planets_by_type(): void
    {
        $starPost = $this->tester->haveStar(['id' => 'TEST_STAR']);

        $this->tester->havePlanet($starPost->postId(), [
            'id' => 'TERRESTRIAL_1',
            'starId' => 'TEST_STAR',
            'type' => Planet::TYPE_TERRESTRIAL,
        ]);

        $this->tester->havePlanet($starPost->postId(), [
            'id' => 'GAS_GIANT_1',
            'starId' => 'TEST_STAR',
            'type' => Planet::TYPE_GAS_GIANT,
            'orbitIndex' => 1,
        ]);

        $terrestrial = $this->repository->byType(Planet::TYPE_TERRESTRIAL);
        $gasGiants = $this->repository->byType(Planet::TYPE_GAS_GIANT);

        $this->assertCount(1, $terrestrial);
        $this->assertCount(1, $gasGiants);
    }

    public function test_count_returns_correct_number(): void
    {
        $this->assertSame(0, $this->repository->count());

        $starPost = $this->tester->haveStar(['id' => 'TEST_STAR']);

        $this->tester->havePlanet($starPost->postId(), [
            'id' => 'COUNT_1',
            'starId' => 'TEST_STAR',
        ]);
        $this->assertSame(1, $this->repository->count());

        $this->tester->havePlanet($starPost->postId(), [
            'id' => 'COUNT_2',
            'starId' => 'TEST_STAR',
            'orbitIndex' => 1,
        ]);
        $this->assertSame(2, $this->repository->count());
    }

    public function test_delete_for_star_removes_all_planets(): void
    {
        $starPost = $this->tester->haveStar(['id' => 'TEST_STAR']);
        $this->tester->havePlanets($starPost->postId(), 3, [
            'id' => 'BULK_P',
            'starId' => 'TEST_STAR',
        ]);

        $deleted = $this->repository->deleteForStar('TEST_STAR');

        $this->assertSame(3, $deleted);
        $this->assertSame(0, $this->repository->count());
    }
}
