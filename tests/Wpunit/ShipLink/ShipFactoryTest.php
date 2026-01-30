<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\ShipLink\Contracts\ShipLink;
use Helm\ShipLink\Ship;
use Helm\ShipLink\ShipFactory;
use Helm\ShipLink\ShipModel;
use Helm\ShipLink\ShipSystems;
use Helm\ShipLink\ShipSystemsRepository;
use Helm\Ships\ShipPost;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\ShipFactory
 *
 * @property WpunitTester $tester
 */
class ShipFactoryTest extends WPTestCase
{
    private ShipFactory $factory;
    private ShipSystemsRepository $systemsRepository;

    public function _before(): void
    {
        parent::_before();
        $this->systemsRepository = new ShipSystemsRepository();
        $this->factory = new ShipFactory($this->systemsRepository);
    }

    public function test_build_creates_ship_link(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Test Ship']);
        $postId = $this->getShipPostId($ship->id);

        $shipLink = $this->factory->build($postId);

        $this->assertInstanceOf(ShipLink::class, $shipLink);
        $this->assertInstanceOf(Ship::class, $shipLink);
        $this->assertSame($postId, $shipLink->getId());
    }

    public function test_build_throws_for_invalid_post_id(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Ship post not found');

        $this->factory->build(99999);
    }

    public function test_build_creates_systems_if_missing(): void
    {
        $ship = $this->tester->haveShip();
        $postId = $this->getShipPostId($ship->id);

        $this->assertFalse($this->systemsRepository->exists($postId));

        $this->factory->build($postId);

        $this->assertTrue($this->systemsRepository->exists($postId));
    }

    public function test_build_from_post(): void
    {
        $ship = $this->tester->haveShip(['name' => 'From Post']);
        $postId = $this->getShipPostId($ship->id);
        $shipPost = ShipPost::fromId($postId);

        $shipLink = $this->factory->buildFromPost($shipPost);

        $this->assertSame('From Post', $shipLink->getModel()->name);
    }

    public function test_build_from_parts(): void
    {
        $ship = $this->tester->haveShip(['name' => 'From Parts']);
        $postId = $this->getShipPostId($ship->id);
        $shipPost = ShipPost::fromId($postId);
        $systems = ShipSystems::defaults($postId);

        $shipLink = $this->factory->buildFromParts($shipPost, $systems);

        $this->assertSame('From Parts', $shipLink->getModel()->name);
        $this->assertSame(750.0, $shipLink->getModel()->coreLife); // Default from EpochS
    }

    public function test_build_from_model(): void
    {
        $ship = $this->tester->haveShip();
        $postId = $this->getShipPostId($ship->id);
        $shipPost = ShipPost::fromId($postId);
        $systems = ShipSystems::defaults($postId);
        $model = ShipModel::fromParts($shipPost, $systems);

        // Modify model
        $model->coreLife = 100.0;

        $shipLink = $this->factory->buildFromModel($model);

        $this->assertSame(100.0, $shipLink->getModel()->coreLife);
    }

    public function test_ship_link_has_all_systems(): void
    {
        $ship = $this->tester->haveShip();
        $postId = $this->getShipPostId($ship->id);

        $shipLink = $this->factory->build($postId);

        $this->assertNotNull($shipLink->power());
        $this->assertNotNull($shipLink->propulsion());
        $this->assertNotNull($shipLink->sensors());
        $this->assertNotNull($shipLink->navigation());
        $this->assertNotNull($shipLink->shields());
        $this->assertNotNull($shipLink->hull());
    }

    /**
     * Get the WordPress post ID for a ship by its string ID.
     */
    private function getShipPostId(string $shipId): int
    {
        global $wpdb;
        return (int) $wpdb->get_var($wpdb->prepare(
            "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_helm_ship_id' AND meta_value = %s",
            $shipId
        ));
    }
}
