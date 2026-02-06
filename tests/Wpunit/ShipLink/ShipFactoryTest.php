<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\ShipLink\Contracts\ShipLink;
use Helm\ShipLink\Loadout;
use Helm\ShipLink\LoadoutFactory;
use Helm\ShipLink\Ship;
use Helm\ShipLink\ShipFactory;
use Helm\ShipLink\Models\ShipState;
use Helm\ShipLink\ShipStateRepository;
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
    private ShipStateRepository $stateRepository;
    private LoadoutFactory $loadoutFactory;

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();

        $this->stateRepository = helm(ShipStateRepository::class);
        $this->loadoutFactory = helm(LoadoutFactory::class);
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

    public function test_build_loads_state_and_loadout(): void
    {
        $shipPost = $this->tester->haveShip();
        $postId = $shipPost->postId();

        $ship = $this->factory->build($postId);

        $this->assertInstanceOf(ShipState::class, $ship->getState());
        $this->assertInstanceOf(Loadout::class, $ship->getLoadout());
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
        $state = $this->stateRepository->findOrCreate($postId);
        $loadout = $this->loadoutFactory->build($postId);

        $shipLink = $this->factory->buildFromParts($shipPost, $state, $loadout);

        $this->assertSame('From Parts', $shipLink->getName());
        // Default loadout: Epoch-S core with 750 hp
        $this->assertSame(750, $shipLink->getLoadout()->core()->life());
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
