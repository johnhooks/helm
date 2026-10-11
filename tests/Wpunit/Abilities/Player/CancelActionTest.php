<?php

declare(strict_types=1);

namespace Tests\Wpunit\Abilities\Player;

use Helm\Ships\ShipPost;
use Helm\Core\ErrorCode;
use Helm\Lib\Date;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\ActionProcessor;
use Helm\ShipLink\Contracts\ShipStateRepository;
use WP_REST_Request;
use Helm\ShipLink\Contracts\ActionRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Abilities\Player\CancelAction
 * @property WpunitTester $tester
 */
class CancelActionTest extends WPTestCase
{
    private int $owner;
    private int $other;
    private int $origin;
    private int $target;
    private ShipPost $ship;

    public function set_up(): void
    {
        parent::set_up();
        $this->tester->haveOrigin();
        $this->owner = self::factory()->user->create(['role' => 'subscriber']);
        $this->other = self::factory()->user->create(['role' => 'subscriber']);
        $from = $this->tester->haveStar(['id' => 'ABILITY_FROM', 'distanceLy' => 0.0]);
        $this->origin = $this->tester->getNodeForStar($from)->id;
        $to = $this->tester->haveStar(['id' => 'ABILITY_TO', 'distanceLy' => 1.0]);
        $this->target = $this->tester->getNodeForStar($to)->id;
        $this->ship = $this->tester->haveShip([
            'ownerId' => $this->owner, 'node_id' => $this->origin, 'core_life' => 1000.0,
        ]);
        wp_set_current_user($this->owner);
    }

    public function test_stops_scan_without_another_cycle_and_restart_resets_work(): void
    {
        $created = wp_get_ability('helm/scan-route')->execute([
            'ship_id' => $this->ship->postId(), 'target_node_id' => $this->target,
        ]);
        $repository = helm(ActionRepository::class);
        $action = $repository->find($created['id']);
        $runtime = $action->runtime_state;
        $runtime['work'] = 8.0;
        $runtime['spent'] = 2.0;
        $runtime['completed'] = 2;
        $action->runtime_state = $runtime;
        $action->status = ActionStatus::Running;
        $action->deferred_until = Date::subSeconds(Date::now(), 10);
        $repository->update($action);
        $power = helm(ShipStateRepository::class)->find($this->ship->postId())->power_full_at;
        $stopped = wp_get_ability('helm/cancel-action')->execute(['action_id' => $action->id]);
        $this->assertSame('fulfilled', $stopped['status']);
        $this->assertSame('player_stopped', $stopped['result']['progress']['stop_reason']);
        $this->assertNull($stopped['deferred_until']);
        $this->assertNull(helm(ShipStateRepository::class)->find($this->ship->postId())->current_action_id);
        $this->assertEquals($power, helm(ShipStateRepository::class)->find($this->ship->postId())->power_full_at);
        $this->assertEquals($runtime, $repository->find($action->id)->runtime_state);
        $this->assertEquals($stopped, wp_get_ability('helm/cancel-action')->execute(['action_id' => $action->id]));
        helm(ActionProcessor::class)->processReady();
        $this->assertEquals($runtime, $repository->find($action->id)->runtime_state);
        $restart = wp_get_ability('helm/scan-route')->execute([
            'ship_id' => $this->ship->postId(), 'target_node_id' => $this->target,
        ]);
        $this->assertIsArray($restart);
        $this->assertEquals(0, $repository->find($restart['id'])->runtime_state['work']);
    }

    public function test_preserves_discoveries_and_finished_outcomes(): void
    {
        $created = wp_get_ability('helm/scan-route')->execute([
            'ship_id' => $this->ship->postId(), 'target_node_id' => $this->target,
        ]);
        $repository = helm(ActionRepository::class);
        $action = $repository->find($created['id']);
        $result = $action->result;
        $result['discovered_edge_ids'] = [123];
        $action->result = $result;
        $repository->update($action);
        $stopped = wp_get_ability('helm/cancel-action')->execute(['action_id' => $action->id]);
        $this->assertSame('partial', $stopped['status']);
        $this->assertSame([123], $stopped['result']['discovered_edge_ids']);
        $action = $repository->find($action->id);
        $action->fail(ErrorCode::ActionFailed->error('Example failure'));
        $repository->update($action);
        $finished = wp_get_ability('helm/get-action')->execute(['action_id' => $action->id]);
        $this->assertEquals($finished, wp_get_ability('helm/cancel-action')->execute(['action_id' => $action->id]));
    }

    public function test_rejects_worker_claim_and_unsupported_jump(): void
    {
        $created = wp_get_ability('helm/scan-route')->execute([
            'ship_id' => $this->ship->postId(), 'target_node_id' => $this->target,
        ]);
        $repository = helm(ActionRepository::class);
        $action = $repository->find($created['id']);
        $action->deferred_until = Date::subSeconds(Date::now(), 10);
        $repository->update($action);
        $this->assertTrue($repository->claim($action->id));
        $error = wp_get_ability('helm/cancel-action')->execute(['action_id' => $action->id]);
        $this->assertWPError($error);
        $this->assertSame(ErrorCode::ActionInProgress->code(), $error->get_error_code());
        $action = $repository->find($action->id);
        $this->assertFalse($action->status->isFinalState());
        $repository->release($action);
        $action->type = ActionType::Jump;
        $repository->update($action);
        $error = wp_get_ability('helm/cancel-action')->execute(['action_id' => $action->id]);
        $this->assertSame(ErrorCode::ActionCancellationUnsupported->code(), $error->get_error_code());
        $this->assertSame($action->id, helm(ShipStateRepository::class)->find($this->ship->postId())->current_action_id);
    }

    public function test_checks_ownership_and_exposes_shared_rest_endpoint(): void
    {
        $this->setExpectedIncorrectUsage('WP_Ability::execute');
        $created = wp_get_ability('helm/scan-route')->execute([
            'ship_id' => $this->ship->postId(), 'target_node_id' => $this->target,
        ]);
        $ability = wp_get_ability('helm/cancel-action');
        wp_set_current_user($this->other);
        $this->assertWPError($ability->execute(['action_id' => $created['id']]));
        $request = new WP_REST_Request('POST', '/helm/v1/actions/' . $created['id'] . '/cancel');
        $this->assertSame(403, rest_do_request($request)->get_status());
        wp_set_current_user(0);
        $this->assertWPError($ability->execute(['action_id' => $created['id']]));
        wp_set_current_user($this->owner);
        $response = rest_do_request($request);
        $this->assertSame(200, $response->get_status());
        $this->assertSame('player_stopped', $response->get_data()['result']['progress']['stop_reason']);
        $this->assertWPError($ability->execute(['action_id' => 99999999]));
    }
}
