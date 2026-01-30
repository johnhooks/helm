<?php

declare(strict_types=1);

namespace Tests\Support\Helper;

use Codeception\Module;
use Helm\Origin\Origin;
use Helm\Planets\Planet;
use Helm\Planets\PlanetRepository;
use Helm\Ships\Ship;
use Helm\Ships\ShipRepository;
use Helm\Stars\Star;
use Helm\Stars\StarRepository;

/**
 * Helm-specific test helper.
 *
 * Provides methods for creating test data and managing game state.
 *
 * Note: Database cleanup is handled automatically by WPLoader's
 * transaction rollback after each test.
 */
class Helm extends Module
{

    /**
     * Initialize Origin for testing.
     *
     * @param string $id Origin ID
     * @param string $seed Master seed
     * @return \Helm\Origin\OriginConfig
     */
    public function haveOrigin(string $id = 'test-origin', string $seed = 'test-seed'): \Helm\Origin\OriginConfig
    {
        /** @var Origin $origin */
        $origin = helm(Origin::class);
        $origin->reset();

        return $origin->initialize($id, $seed);
    }

    /**
     * Create a star in the database.
     *
     * @param array<string, mixed> $attributes Star attributes to override defaults
     * @return \Helm\Stars\StarPost
     */
    public function haveStar(array $attributes = []): \Helm\Stars\StarPost
    {
        $defaults = [
            'id' => 'TEST_' . uniqid(),
            'name' => null,
            'spectralType' => 'G2V',
            'distanceLy' => 10.0,
            'ra' => 0.0,
            'dec' => 0.0,
            'properties' => [],
            'confirmedPlanets' => [],
        ];

        $data = array_merge($defaults, $attributes);

        $star = new Star(
            id: $data['id'],
            name: $data['name'],
            spectralType: $data['spectralType'],
            distanceLy: $data['distanceLy'],
            ra: $data['ra'],
            dec: $data['dec'],
            properties: $data['properties'],
            confirmedPlanets: $data['confirmedPlanets'],
        );

        /** @var StarRepository $repository */
        $repository = helm(StarRepository::class);

        return $repository->save($star);
    }

    /**
     * Create multiple stars in the database.
     *
     * @param int $count Number of stars to create
     * @param array<string, mixed> $attributes Attributes to apply to all stars
     * @return array<\Helm\Stars\StarPost>
     */
    public function haveStars(int $count, array $attributes = []): array
    {
        $stars = [];
        for ($i = 0; $i < $count; $i++) {
            $attrs = $attributes;
            $attrs['id'] = ($attributes['id'] ?? 'TEST') . '_' . $i;
            $stars[] = $this->haveStar($attrs);
        }
        return $stars;
    }

    /**
     * Create a planet in the database.
     *
     * @param int $starPostId Parent star post ID
     * @param array<string, mixed> $attributes Planet attributes to override defaults
     * @return \Helm\Planets\PlanetPost
     */
    public function havePlanet(int $starPostId, array $attributes = []): \Helm\Planets\PlanetPost
    {
        $defaults = [
            'id' => 'TEST_P' . uniqid(),
            'starId' => 'TEST_STAR',
            'name' => 'Test Planet',
            'type' => Planet::TYPE_TERRESTRIAL,
            'orbitIndex' => 0,
            'orbitAu' => 1.0,
            'radiusEarth' => 1.0,
            'massEarth' => 1.0,
            'habitable' => false,
            'confirmed' => false,
            'moons' => 0,
            'resources' => [],
        ];

        $data = array_merge($defaults, $attributes);

        $planet = new Planet(
            id: $data['id'],
            starId: $data['starId'],
            name: $data['name'],
            type: $data['type'],
            orbitIndex: $data['orbitIndex'],
            orbitAu: $data['orbitAu'],
            radiusEarth: $data['radiusEarth'],
            massEarth: $data['massEarth'],
            habitable: $data['habitable'],
            confirmed: $data['confirmed'],
            moons: $data['moons'],
            resources: $data['resources'],
        );

        /** @var PlanetRepository $repository */
        $repository = helm(PlanetRepository::class);

        return $repository->save($planet, $starPostId);
    }

    /**
     * Create multiple planets for a star.
     *
     * @param int $starPostId Parent star post ID
     * @param int $count Number of planets to create
     * @param array<string, mixed> $attributes Attributes to apply to all planets
     * @return array<\Helm\Planets\PlanetPost>
     */
    public function havePlanets(int $starPostId, int $count, array $attributes = []): array
    {
        $planets = [];
        for ($i = 0; $i < $count; $i++) {
            $attrs = $attributes;
            $attrs['id'] = ($attributes['id'] ?? 'TEST_P') . $i;
            $attrs['orbitIndex'] = $i;
            $attrs['orbitAu'] = ($i + 1) * 0.5;
            $planets[] = $this->havePlanet($starPostId, $attrs);
        }
        return $planets;
    }

    /**
     * Create a ship in the database.
     *
     * @param array<string, mixed> $attributes Ship attributes to override defaults
     * @return \Helm\Ships\Ship
     */
    public function haveShip(array $attributes = []): Ship
    {
        $defaults = [
            'id' => 'SHIP_' . uniqid(),
            'name' => 'Test Ship',
            'location' => 'SOL',
            'nodeId' => 0,
            'credits' => 1000,
            'fuel' => Ship::DEFAULT_FUEL,
            'driveRange' => Ship::DEFAULT_DRIVE_RANGE,
            'navSkill' => Ship::DEFAULT_NAV_SKILL,
            'navEfficiency' => Ship::DEFAULT_NAV_EFFICIENCY,
            'cargo' => [],
            'artifacts' => [],
            'createdAt' => time(),
            'updatedAt' => time(),
        ];

        $data = array_merge($defaults, $attributes);

        $ship = new Ship(
            id: $data['id'],
            name: $data['name'],
            location: $data['location'],
            nodeId: $data['nodeId'],
            credits: $data['credits'],
            fuel: $data['fuel'],
            driveRange: $data['driveRange'],
            navSkill: $data['navSkill'],
            navEfficiency: $data['navEfficiency'],
            cargo: $data['cargo'],
            artifacts: $data['artifacts'],
            createdAt: $data['createdAt'],
            updatedAt: $data['updatedAt'],
        );

        /** @var ShipRepository $repository */
        $repository = helm(ShipRepository::class);
        $repository->save($ship);

        return $ship;
    }

    /**
     * Create multiple ships in the database.
     *
     * @param int $count Number of ships to create
     * @param array<string, mixed> $attributes Attributes to apply to all ships
     * @return array<\Helm\Ships\Ship>
     */
    public function haveShips(int $count, array $attributes = []): array
    {
        $ships = [];
        for ($i = 0; $i < $count; $i++) {
            $attrs = $attributes;
            $attrs['id'] = ($attributes['id'] ?? 'SHIP') . '_' . $i;
            $attrs['name'] = ($attributes['name'] ?? 'Ship') . ' ' . $i;
            $ships[] = $this->haveShip($attrs);
        }
        return $ships;
    }

    /**
     * Get a star by ID.
     */
    public function grabStar(string $id): ?\Helm\Stars\StarPost
    {
        /** @var StarRepository $repository */
        $repository = helm(StarRepository::class);
        return $repository->get($id);
    }

    /**
     * Get a ship by ID.
     */
    public function grabShip(string $id): ?Ship
    {
        /** @var ShipRepository $repository */
        $repository = helm(ShipRepository::class);
        return $repository->get($id);
    }

    /**
     * Assert a star exists.
     */
    public function seeStarInDatabase(string $id): void
    {
        $this->assertNotNull(
            $this->grabStar($id),
            "Expected star '{$id}' to exist in database."
        );
    }

    /**
     * Assert a star does not exist.
     */
    public function dontSeeStarInDatabase(string $id): void
    {
        $this->assertNull(
            $this->grabStar($id),
            "Expected star '{$id}' to not exist in database."
        );
    }

    /**
     * Assert a ship exists.
     */
    public function seeShipInDatabase(string $id): void
    {
        $this->assertNotNull(
            $this->grabShip($id),
            "Expected ship '{$id}' to exist in database."
        );
    }

    /**
     * Assert a ship does not exist.
     */
    public function dontSeeShipInDatabase(string $id): void
    {
        $this->assertNull(
            $this->grabShip($id),
            "Expected ship '{$id}' to not exist in database."
        );
    }
}
