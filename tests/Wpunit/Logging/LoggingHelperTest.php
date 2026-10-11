<?php

declare(strict_types=1);

namespace Tests\Wpunit\Logging;

use Helm\ShipLink\ActionFactory;
use Helm\ShipLink\ActionType;
use Monolog\Handler\NullHandler;
use Monolog\Logger;
use Psr\Log\LoggerInterface;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Tests\Support\Helper\Logging
 * @property WpunitTester $tester
 */
class LoggingHelperTest extends WPTestCase
{
    public function test_defaults_to_null_logging_and_records_interpolated_messages_on_request(): void
    {
        $logger = helm(LoggerInterface::class);
        $this->assertInstanceOf(Logger::class, $logger);
        $this->assertInstanceOf(NullHandler::class, $logger->getHandlers()[0]);
        $logger->error('Discard this');

        $recording = $this->tester->fakeLogging();
        $logger->debug('Scan {action_id}', ['action_id' => 42]);
        $this->assertCount(1, $recording->getRecords());
        $this->assertTrue($recording->hasDebug('Scan 42'));
        $this->assertSame(['action_id' => 42], $recording->getRecords()[0]->context);
        $this->assertFalse($recording->hasErrorRecords());
    }

    public function test_recording_covers_an_already_constructed_service(): void
    {
        $this->tester->haveSimulation();
        $this->tester->haveSimulationNode(0);
        $target = $this->tester->haveSimulationNode(0.5);
        $ship = $this->tester->haveSimulationShip();
        $factory = helm(ActionFactory::class);
        $recording = $this->tester->fakeLogging();
        $action = $factory->create($ship->getId(), ActionType::ScanRoute, ['target_node_id' => $target->id]);
        $this->assertTrue($recording->hasInfo('Action ' . $action->id . ' queued for ship ' . $ship->getId()));
    }

    public function test_recording_survives_simulation_setup_and_resets_between_recorders(): void
    {
        $this->assertInstanceOf(NullHandler::class, helm(LoggerInterface::class)->getHandlers()[0]);
        $recording = $this->tester->fakeLogging();
        $this->tester->haveSimulation();
        $this->tester->haveSimulationNode(0);
        $target = $this->tester->haveSimulationNode(0.5);
        $ship = $this->tester->haveSimulationShip();
        $this->tester->dispatchSimulationAction($ship->getId(), ActionType::ScanRoute, ['target_node_id' => $target->id]);
        $this->tester->advanceSimulationToNextCheckpoint();
        $this->assertTrue($recording->hasDebugThatContains('processed cycle 1'));

        $next = $this->tester->fakeLogging();
        $this->assertSame([], $next->getRecords());
        helm(LoggerInterface::class)->warning('New recorder');
        $this->assertTrue($next->hasWarning('New recorder'));
        $this->assertFalse($recording->hasWarning('New recorder'));
    }
}
