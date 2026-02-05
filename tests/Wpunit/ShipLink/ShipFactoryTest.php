<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\ShipLink\Contracts\ShipLink;
use Helm\ShipLink\Ship;
use Helm\ShipLink\ShipFactory;
use Helm\ShipLink\Models\ShipSystems;
use Helm\ShipLink\ShipSystemsRepository;
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
        $this->tester->haveOrigin();

        $this->systemsRepository = helm(ShipSystemsRepository::class);
        $this->factory = helm(ShipFactory::class);
    }

    public function test_build_creates_ship_link(): void
    {
        $shipPost = $this->tester->haveShip(['name' => 'Test Ship']);
        $postId = $shipPost->postId();

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
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        $this->assertFalse($this->systemsRepository->exists($postId));

        $this->factory->build($postId);

        $this->assertTrue($this->systemsRepository->exists($postId));
    }

    public function test_build_from_post(): void
    {
        $shipPost = $this->tester->haveShip(['name' => 'From Post']);

        $shipLink = $this->factory->buildFromPost($shipPost);

        $this->assertSame('From Post', $shipLink->getName());
    }

    public function test_build_from_parts(): void
    {
        $shipPost = $this->tester->haveShip(['name' => 'From Parts']);
        $postId = $shipPost->postId();
        $systems = ShipSystems::defaults($postId);

        $shipLink = $this->factory->buildFromParts($shipPost, $systems);

        $this->assertSame('From Parts', $shipLink->getName());
        $this->assertSame(750.0, $shipLink->getRecord()->core_life); // Default from EpochS
    }

    public function test_ship_link_has_all_systems(): void
    {
        $shipPost = $this->tester->haveShip();
        $postId = $shipPost->postId();

        $shipLink = $this->factory->build($postId);

        $this->assertNotNull($shipLink->power());
        $this->assertNotNull($shipLink->propulsion());
        $this->assertNotNull($shipLink->sensors());
        $this->assertNotNull($shipLink->navigation());
        $this->assertNotNull($shipLink->shields());
        $this->assertNotNull($shipLink->hull());
    }
}
