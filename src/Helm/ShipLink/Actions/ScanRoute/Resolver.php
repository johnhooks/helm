<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\ScanRoute;

use Helm\Lib\Date;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\NavigationService;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\Contracts\ActionHandler;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Ship;

/**
 * Resolves route scan actions one checkpoint at a time.
 */
final class Resolver implements ActionHandler
{
    private const DEFAULT_SCAN_CYCLE_SECONDS = 300;
    private const DEFAULT_MAX_SCAN_PHASES = 50;

    public function __construct(
        private readonly NavigationService $navigationService,
        private readonly UserEdgeRepository $userEdgeRepository,
    ) {
    }

    public function handle(Action $action, Ship $ship): void
    {
        $result = $action->result ?? [];
        $phases = $this->phases($result);
        $phaseNumber = count($phases) + 1;

        if ($this->hasReachedPhaseLimit($result, $phaseNumber)) {
            $this->finishAtPhaseLimit($action, $result);
            return;
        }

        $originalFromNodeId = (int) ($result['from_node_id'] ?? $ship->navigation()->getCurrentPosition());
        $fromNodeId = $this->currentScanSource($result, $originalFromNodeId);
        $toNodeId = (int) ($result['to_node_id'] ?? $action->get('target_node_id'));
        $skill = (float) ($result['skill'] ?? $ship->navigation()->getSkill());
        $efficiency = (float) ($result['efficiency'] ?? $ship->navigation()->getEfficiency());

        $scanPhase = $this->navigationService->scanNextHop(
            fromNodeId: $fromNodeId,
            toNodeId: $toNodeId,
            skill: $skill,
            efficiency: $efficiency,
            rollFirstHop: $phaseNumber === 1,
        );

        if ($scanPhase->failed || $scanPhase->edge === null || $scanPhase->node === null) {
            $phase = [
                'phase_number' => $phaseNumber,
                'from_node_id' => $fromNodeId,
                'target_node_id' => $toNodeId,
                'outcome' => 'failed',
                'complete' => false,
                'completed_at' => Date::nowString(),
            ];

            $phases[] = $phase;
            $result['phases'] = $phases;
            $this->updateSummary($result, success: false, complete: false);
            $action->fulfill($result);
            return;
        }

        $this->userEdgeRepository->upsert($ship->getOwnerId(), $scanPhase->edge->id);

        $phase = [
            'phase_number' => $phaseNumber,
            'from_node_id' => $fromNodeId,
            'target_node_id' => $toNodeId,
            'discovered_node_id' => $scanPhase->node->id,
            'discovered_edge_id' => $scanPhase->edge->id,
            'hop_depth' => $phaseNumber,
            'outcome' => $scanPhase->complete ? 'complete' : 'waypoint',
            'complete' => $scanPhase->complete,
            'completed_at' => Date::nowString(),
        ];

        $path = $this->intList($result['path'] ?? []);
        $edgeIds = $this->intList($result['discovered_edge_ids'] ?? []);
        $nodeIds = $this->intList($result['discovered_node_ids'] ?? []);

        if (! $scanPhase->complete && in_array($scanPhase->node->id, $path, true)) {
            $phase['outcome'] = 'cycle_detected';
            $phase['continues'] = false;
            $phases[] = $phase;
            $result['phases'] = $phases;
            $this->updateSummary($result, success: true, complete: false);
            $action->result = $result;
            $action->status = ActionStatus::Partial;
            $action->processing_at = null;
            return;
        }

        $path[] = $scanPhase->node->id;
        $edgeIds[] = $scanPhase->edge->id;
        $nodeIds[] = $scanPhase->node->id;

        $result['path'] = $path;
        $result['discovered_edge_ids'] = $edgeIds;
        $result['discovered_node_ids'] = $nodeIds;

        if ($scanPhase->complete) {
            $phases[] = $phase;
            $result['phases'] = $phases;
            $this->updateSummary($result, success: true, complete: true);
            $action->fulfill($result);
            return;
        }

        $continuation = $this->navigationService->rollScanContinuation(
            fromNodeId: $scanPhase->node->id,
            toNodeId: $toNodeId,
            skill: $skill,
            efficiency: $efficiency,
            hopIndex: $phaseNumber,
        );

        $phase['continuation_probability'] = $continuation['probability'];
        $phase['continuation_roll'] = $continuation['roll'];
        $phase['continues'] = $continuation['continues'];
        $phases[] = $phase;
        $result['phases'] = $phases;

        if (! $continuation['continues']) {
            $this->updateSummary($result, success: true, complete: false);
            $action->result = $result;
            $action->status = ActionStatus::Partial;
            $action->processing_at = null;
            return;
        }

        $this->updateSummary($result, success: true, complete: false);
        $action->result = $result;
        $action->status = ActionStatus::Running;
        $action->deferred_until = $this->checkpointAt($result, count($phases) + 1);
    }

    /**
     * @param array<string, mixed> $result
     * @return array<int, array<string, mixed>>
     */
    private function phases(array $result): array
    {
        return isset($result['phases']) && is_array($result['phases'])
            ? array_values($result['phases'])
            : [];
    }

    /**
     * @param array<string, mixed> $result
     */
    private function currentScanSource(array $result, int $originalFromNodeId): int
    {
        $path = $this->intList($result['path'] ?? []);

        return $path !== [] ? $path[array_key_last($path)] : $originalFromNodeId;
    }

    /**
     * @param mixed $value
     * @return int[]
     */
    private function intList(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        return array_values(array_map('intval', $value));
    }

    /**
     * @param array<string, mixed> $result
     */
    private function hasReachedPhaseLimit(array $result, int $phaseNumber): bool
    {
        $maxPhases = (int) ($result['max_scan_phases'] ?? self::DEFAULT_MAX_SCAN_PHASES);

        return $phaseNumber > max(1, $maxPhases);
    }

    /**
     * @param array<string, mixed> $result
     */
    private function finishAtPhaseLimit(Action $action, array $result): void
    {
        $hasDiscoveries = $this->intList($result['discovered_edge_ids'] ?? []) !== [];
        $result['phases'] = $this->phases($result);
        $result['stopped_reason'] = 'phase_limit';
        $this->updateSummary($result, success: $hasDiscoveries, complete: false);

        $action->result = $result;
        $action->status = $hasDiscoveries ? ActionStatus::Partial : ActionStatus::Fulfilled;
        $action->processing_at = null;
    }

    /**
     * @param array<string, mixed> $result
     */
    private function updateSummary(array &$result, bool $success, bool $complete): void
    {
        $edgeIds = $this->intList($result['discovered_edge_ids'] ?? []);
        $nodeIds = $this->intList($result['discovered_node_ids'] ?? []);
        $waypointCount = 0;

        foreach ($result['phases'] ?? [] as $phase) {
            if (! is_array($phase) || ($phase['outcome'] ?? null) !== 'waypoint') {
                continue;
            }

            $waypointCount++;
        }

        $result['success'] = $success;
        $result['complete'] = $complete;
        $result['edges_discovered'] = count($edgeIds);
        $result['waypoints_created'] = $waypointCount;
        $result['path'] = $this->intList($result['path'] ?? []);
        $result['discovered_edge_ids'] = $edgeIds;
        $result['discovered_node_ids'] = $nodeIds;
    }

    /**
     * @param array<string, mixed> $result
     */
    private function checkpointAt(array $result, int $phaseNumber): \DateTimeImmutable
    {
        $startedAt = isset($result['started_at']) && is_string($result['started_at'])
            ? Date::fromString($result['started_at'])
            : Date::now();
        $cycleSeconds = (int) ($result['cycle_seconds'] ?? self::DEFAULT_SCAN_CYCLE_SECONDS);
        $cycleSeconds = max(1, $cycleSeconds);

        return Date::addSeconds($startedAt, $cycleSeconds * $phaseNumber);
    }
}
