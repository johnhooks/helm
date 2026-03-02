<?php

declare(strict_types=1);

namespace Tests\Support\Helper;

use Codeception\Module;
use Codeception\TestInterface;
use Helm\Celestials\CelestialRepository;
use Helm\Celestials\CelestialType;
use Helm\Database\Transaction;
use Helm\Generation\PlanetType;
use Helm\Inventory\Contracts\InventoryRepository;
use Helm\Inventory\LocationType;
use Helm\Inventory\Models\Item;
use Helm\Navigation\Node;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Origin\Origin;
use Helm\Planets\Planet;
use Helm\Planets\PlanetRepository;
use Helm\PostTypes\PostTypeRegistry;
use Helm\Products\Models\Product;
use Helm\Products\Contracts\ProductRepository;
use Helm\ShipLink\LoadoutFactory;
use Helm\ShipLink\ShipFittingSlot;
use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\Ships\ShipPost;
use Helm\Stars\Star;
use Helm\Stars\StarPost;
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
     * Re-register post meta before each test.
     *
     * WP's test framework calls unregister_all_meta_keys() in tear_down(),
     * which nukes all registered meta. This ensures REST-exposed meta
     * survives across tests.
     */
    public function _before(TestInterface $test): void
    {
        helm(PostTypeRegistry::class)->registerMeta();
    }

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
     * Create a ship in the database with default loadout.
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

        // Create state record (operational state)
        /** @var ShipStateRepository $stateRepository */
        $stateRepository = helm(ShipStateRepository::class);
        $state = $stateRepository->findOrCreate($postId);

        // Apply state overrides
        if (array_key_exists('node_id', $data)) {
            $state->node_id = $data['node_id'];
        }

        if (array_key_exists('current_action_id', $data)) {
            $state->current_action_id = $data['current_action_id'];
        }

        if ($state->isDirty()) {
            $stateRepository->update($state);
        }

        // Create default loadout (components in inventory)
        /** @var LoadoutFactory $loadoutFactory */
        $loadoutFactory = helm(LoadoutFactory::class);
        $loadout = $loadoutFactory->buildDefaults($postId, $data['ownerId']);

        // Apply core_life override if specified
        if (array_key_exists('core_life', $data)) {
            $coreComponent = $loadout->core()->component();
            $coreComponent->life = (int) $data['core_life'];

            /** @var InventoryRepository $inventoryRepository */
            $inventoryRepository = helm(InventoryRepository::class);
            $inventoryRepository->update($coreComponent);
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
     * Create a product in the database.
     *
     * @param array<string, mixed> $attributes
     */
    public function haveProduct(array $attributes = []): Product
    {
        $defaults = [
            'slug' => 'test_product_' . uniqid(),
            'type' => 'core',
            'label' => 'Test Product',
            'version' => 1,
            'hp' => 100,
            'footprint' => 10,
            'rate' => null,
            'range' => null,
            'capacity' => null,
            'chance' => null,
            'mult_a' => null,
            'mult_b' => null,
            'mult_c' => null,
        ];

        $data = array_merge($defaults, $attributes);

        $product = new Product($data);

        /** @var ProductRepository $repository */
        $repository = helm(ProductRepository::class);
        $id = $repository->insert($product);

        // Refetch to get the model with ID set
        return $id !== false ? ($repository->find($id) ?? $product) : $product;
    }

    /**
     * Create a component inventory item in the database.
     *
     * Components are inventory items with lifecycle data (life, usage_count).
     *
     * @param array<string, mixed> $attributes
     */
    public function haveComponent(array $attributes = []): Item
    {
        $defaults = [
            'user_id' => 1,
            'product_id' => 1,
            'location_type' => LocationType::Personal,
            'location_id' => null,
            'slot' => null,
            'life' => null,
            'usage_count' => 0,
            'meta' => ['origin' => 'starter'],
        ];

        $data = array_merge($defaults, $attributes);

        $item = new Item($data);

        /** @var InventoryRepository $repository */
        $repository = helm(InventoryRepository::class);
        $id = $repository->insert($item);

        // Refetch to get the model with ID set
        return $id !== false ? ($repository->find($id) ?? $item) : $item;
    }

    /**
     * Create a fitted inventory item (component in a slot).
     *
     * @param int $userId Owner of the item
     * @param int $productId The product ID
     * @param ShipFittingSlot|string $slot The slot to fit into
     * @param LocationType $locationType Location type (defaults to Ship)
     * @param int $locationId The location ID (e.g., ship post ID)
     * @param int|null $life Component life (HP remaining)
     */
    public function haveFitting(
        int $userId,
        int $productId,
        ShipFittingSlot|string $slot,
        LocationType $locationType,
        int $locationId,
        ?int $life = null
    ): Item {
        $slotValue = $slot instanceof ShipFittingSlot ? $slot->value : $slot;

        $item = new Item([
            'user_id' => $userId,
            'product_id' => $productId,
            'location_type' => $locationType,
            'location_id' => $locationId,
            'slot' => $slotValue,
            'life' => $life,
            'usage_count' => 0,
            'meta' => ['origin' => 'test'],
        ]);

        /** @var InventoryRepository $repository */
        $repository = helm(InventoryRepository::class);
        $itemId = $repository->insert($item);

        // Refetch to get the model with ID set
        return $itemId !== false ? ($repository->find($itemId) ?? $item) : $item;
    }

    /**
     * Create an inventory item (loose item, not fitted).
     *
     * @param array<string, mixed> $attributes
     */
    public function haveInventoryItem(array $attributes = []): Item
    {
        $defaults = [
            'user_id' => 1,
            'product_id' => 1,
            'location_type' => LocationType::Personal,
            'location_id' => null,
            'slot' => null,
            'quantity' => 1,
            'life' => null,
            'usage_count' => 0,
            'meta' => null,
        ];

        $data = array_merge($defaults, $attributes);

        $item = new Item($data);

        /** @var InventoryRepository $repository */
        $repository = helm(InventoryRepository::class);
        $itemId = $repository->insert($item);

        // Refetch to get the model with ID set
        return $itemId !== false ? ($repository->find($itemId) ?? $item) : $item;
    }

    /**
     * Get the navigation node for a star post via celestials lookup.
     */
    public function getNodeForStar(StarPost $starPost): ?Node
    {
        $celestial = helm(CelestialRepository::class)->findByContent(CelestialType::Star, $starPost->postId());
        return $celestial ? helm(NodeRepository::class)->get($celestial->nodeId) : null;
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
