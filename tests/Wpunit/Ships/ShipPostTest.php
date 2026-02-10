<?php

declare(strict_types=1);

namespace Tests\Wpunit\Ships;

use Helm\Ships\ShipPost;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Ships\ShipPost
 *
 * @property WpunitTester $tester
 */
class ShipPostTest extends WPTestCase
{
    public function test_find_for_user_returns_ship(): void
    {
        $userId = $this->factory()->user->create();
        $shipPost = $this->tester->haveShipPost(['ownerId' => $userId]);

        $found = ShipPost::findForUser($userId);

        $this->assertNotNull($found);
        $this->assertSame($shipPost->postId(), $found->postId());
    }

    public function test_find_for_user_returns_null_for_user_without_ship(): void
    {
        $userId = $this->factory()->user->create();

        $found = ShipPost::findForUser($userId);

        $this->assertNull($found);
    }
}
