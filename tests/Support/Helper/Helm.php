<?php

declare(strict_types=1);

namespace Tests\Support\Helper;

use Codeception\Module;
use Codeception\TestInterface;
use Helm\Database\Transaction;
use Helm\Generation\PlanetType;
use Helm\Origin\Origin;
use Helm\Planets\Planet;
use Helm\Planets\PlanetRepository;
use Helm\PostTypes\PostTypeRegistry;
use Helm\ShipLink\Models\ShipSystems;
use Helm\ShipLink\ShipSystemsRepository;
use Helm\Ships\ShipPost;
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
     * Reset Transaction state after each test.
     *
     * Ensures the static savepoint stack doesn't leak between tests.
     */
    public function _after(TestInterface $test): void
    {
        Transaction::reset();
    }


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
            'type' => PlanetType::Terrestrial,
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
     *                                         Supports: id, name, ownerId, node_id, core_life
     * @return ShipPost
     */
    public function haveShip(array $attributes = []): ShipPost
    {
        $defaults = [
            'id' => 'SHIP_' . uniqid(),
            'name' => 'Test Ship',
            'ownerId' => 1, // Default to admin user
        ];

        $data = array_merge($defaults, $attributes);

        $postId = wp_insert_post([
            'post_type' => PostTypeRegistry::POST_TYPE_SHIP,
            'post_status' => 'publish',
            'post_title' => $data['name'],
            'post_author' => $data['ownerId'],
        ], true);

        if (is_wp_error($postId)) {
            throw new \RuntimeException(
                sprintf('Failed to create ship post: %s', $postId->get_error_message())
            );
        }

        update_post_meta($postId, PostTypeRegistry::META_SHIP_ID, $data['id']);

        // Create systems record (creates defaults)
        /** @var ShipSystemsRepository $systemsRepository */
        $systemsRepository = helm(ShipSystemsRepository::class);
        $systems = $systemsRepository->findOrCreate($postId);

        // Apply any system overrides
        if (array_key_exists('node_id', $data)) {
            $systems->node_id = $data['node_id'];
        }

        if (array_key_exists('core_life', $data)) {
            $systems->core_life = (float) $data['core_life'];
        }

        if (array_key_exists('current_action_id', $data)) {
            $systems->current_action_id = $data['current_action_id'];
        }

        if ($systems->isDirty()) {
            $systemsRepository->update($systems);
        }

        $shipPost = ShipPost::fromId($postId);
        if ($shipPost === null) {
            throw new \RuntimeException('Failed to load ship post after creation');
        }

        return $shipPost;
    }

    /**
     * Create a ship post without initializing systems.
     *
     * Use this for repository tests that need to control systems creation manually.
     *
     * @param array<string, mixed> $attributes Ship attributes to override defaults
     * @return ShipPost
     */
    public function haveShipPost(array $attributes = []): ShipPost
    {
        $defaults = [
            'id' => 'SHIP_' . uniqid(),
            'name' => 'Test Ship',
            'ownerId' => 1,
        ];

        $data = array_merge($defaults, $attributes);

        $postId = wp_insert_post([
            'post_type' => PostTypeRegistry::POST_TYPE_SHIP,
            'post_status' => 'publish',
            'post_title' => $data['name'],
            'post_author' => $data['ownerId'],
        ], true);

        if (is_wp_error($postId)) {
            throw new \RuntimeException(
                sprintf('Failed to create ship post: %s', $postId->get_error_message())
            );
        }

        update_post_meta($postId, PostTypeRegistry::META_SHIP_ID, $data['id']);

        $shipPost = ShipPost::fromId($postId);
        if ($shipPost === null) {
            throw new \RuntimeException('Failed to load ship post after creation');
        }

        return $shipPost;
    }

    /**
     * Create multiple ships in the database.
     *
     * @param int $count Number of ships to create
     * @param array<string, mixed> $attributes Attributes to apply to all ships
     * @return array<ShipPost>
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
     * Get a ship by its string ID.
     */
    public function grabShip(string $id): ?ShipPost
    {
        global $wpdb;

        $postId = $wpdb->get_var($wpdb->prepare(
            "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = %s AND meta_value = %s",
            PostTypeRegistry::META_SHIP_ID,
            $id
        ));

        if ($postId === null) {
            return null;
        }

        return ShipPost::fromId((int) $postId);
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
