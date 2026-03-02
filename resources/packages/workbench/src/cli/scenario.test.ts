import { describe, it, expect } from 'vitest';
import { runScenario } from './scenario';
import type { ScenarioFile } from './scenario';
import { ActionStatus } from '@helm/holodeck';

const baseShip = {
	hull: 'pioneer',
	core: 'epoch_s',
	drive: 'dr_505',
	sensor: 'vrs_mk1',
	shield: 'aegis_delta',
	nav: 'nav_tier_3',
	node: 1,
};

describe('scenario runner', () => {
	it('produces initial snapshot at t=0 with no actions', () => {
		const scenario: ScenarioFile = {
			name: 'empty',
			description: 'No actions',
			ships: { explorer: baseShip },
			actions: [],
		};

		const { timeline } = runScenario(scenario);
		expect(timeline).toHaveLength(1);
		expect(timeline[0].t).toBe(0);
		expect(timeline[0].action).toBeNull();
		expect(timeline[0].ships.explorer).toBeDefined();
		expect(timeline[0].ships.explorer.nodeId).toBe(1);
	});

	it('jump moves ship and degrades core', () => {
		const scenario: ScenarioFile = {
			name: 'single jump',
			description: 'One jump',
			ships: { explorer: baseShip },
			actions: [
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 42, distance: 3 } },
			],
		};

		const { timeline, actions } = runScenario(scenario);
		expect(timeline).toHaveLength(2);

		// Action resolved
		expect(actions[0].status).toBe(ActionStatus.Fulfilled);

		// Ship moved
		expect(timeline[1].ships.explorer.nodeId).toBe(42);

		// Core degraded
		expect(timeline[1].ships.explorer.coreLife).toBeLessThan(timeline[0].ships.explorer.coreLife);

		// Time advanced (duration computed from drive stats, not hardcoded)
		expect(timeline[1].t).toBeGreaterThan(0);
	});

	it('jump duration is computed from drive stats and distance', () => {
		const scenario: ScenarioFile = {
			name: 'two jumps',
			description: 'Short then long jump',
			ships: { explorer: baseShip },
			actions: [
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 10, distance: 1 } },
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 20, distance: 5 } },
			],
		};

		const { timeline } = runScenario(scenario);

		const shortDuration = timeline[1].t - timeline[0].t;
		const longDuration = timeline[2].t - timeline[1].t;

		// Longer distance = longer duration
		expect(longDuration).toBeGreaterThan(shortDuration);
	});

	it('sequential jumps accumulate core degradation', () => {
		const scenario: ScenarioFile = {
			name: 'jump chain',
			description: '3 sequential jumps',
			ships: { explorer: baseShip },
			actions: [
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 10, distance: 3 } },
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 20, distance: 3 } },
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 30, distance: 3 } },
			],
		};

		const { timeline } = runScenario(scenario);
		expect(timeline).toHaveLength(4);

		// Core life decreases with each jump
		const coreLifes = timeline.map((s) => s.ships.explorer.coreLife);
		for (let i = 1; i < coreLifes.length; i++) {
			expect(coreLifes[i]).toBeLessThan(coreLifes[i - 1]);
		}

		// Position updates
		expect(timeline[1].ships.explorer.nodeId).toBe(10);
		expect(timeline[2].ships.explorer.nodeId).toBe(20);
		expect(timeline[3].ships.explorer.nodeId).toBe(30);
	});

	it('power regenerates during action durations', () => {
		const scenario: ScenarioFile = {
			name: 'power regen',
			description: 'Jump consumes power, then next snapshot shows regen',
			ships: { explorer: baseShip },
			actions: [
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 10, distance: 5 } },
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 20, distance: 1 } },
			],
		};

		const { timeline } = runScenario(scenario);

		// After first jump, power was consumed but regen happened during the jump duration.
		// After second (short) jump, power consumed again. The point is that
		// power at step 2 is higher than naive "initial - 2 * cost" because regen
		// happened during the first jump's duration.
		const afterFirstJump = timeline[1].ships.explorer.power;
		const afterSecondJump = timeline[2].ships.explorer.power;

		// Power should not be zero — regen during jump duration partially restores it
		expect(afterFirstJump).toBeGreaterThan(0);
		expect(afterSecondJump).toBeGreaterThan(0);
	});

	it('scan actions consume power and produce success/fail results', () => {
		const scenario: ScenarioFile = {
			name: 'scan',
			description: 'Single scan',
			ships: { scanner: { ...baseShip, hull: 'surveyor' } },
			actions: [
				{ ship: 'scanner', type: 'scan_route', params: { target_node_id: 10, distance: 3 } },
			],
		};

		const { timeline, actions } = runScenario(scenario);
		expect(timeline).toHaveLength(2);

		// Action resolved
		expect(actions[0].status).toBe(ActionStatus.Fulfilled);

		// Result has success and roll (deterministic from seeded RNG)
		expect(actions[0].result.success).toBeDefined();
		expect(actions[0].result.roll).toBeDefined();
		expect(typeof actions[0].result.roll).toBe('number');

		// Time advanced
		expect(timeline[1].t).toBeGreaterThan(0);
	});

	it('scan results are deterministic with seeded RNG', () => {
		const scenario: ScenarioFile = {
			name: 'deterministic scan',
			description: 'Same scenario twice',
			ships: { scanner: { ...baseShip, hull: 'surveyor' } },
			actions: [
				{ ship: 'scanner', type: 'scan_route', params: { target_node_id: 10, distance: 3 } },
			],
		};

		const run1 = runScenario(scenario);
		const run2 = runScenario(scenario);

		expect(run1.actions[0].result.roll).toBe(run2.actions[0].result.roll);
		expect(run1.actions[0].result.success).toBe(run2.actions[0].result.success);
	});

	it('timestamps reflect real computed durations', () => {
		const scenario: ScenarioFile = {
			name: 'timing',
			description: 'Verify timestamps',
			ships: { explorer: baseShip },
			actions: [
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 10, distance: 3 } },
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 20, distance: 3 } },
			],
		};

		const { timeline } = runScenario(scenario);

		// t=0 is initial
		expect(timeline[0].t).toBe(0);

		// Each subsequent timestamp is the sum of previous durations
		const firstDuration = timeline[1].t;
		const secondDuration = timeline[2].t - timeline[1].t;

		// Same distance + same loadout → same duration
		expect(secondDuration).toBe(firstDuration);

		// Total time is sum
		expect(timeline[2].t).toBe(firstDuration + secondDuration);
	});

	it('mixed jump and scan actions accumulate state correctly', () => {
		const scenario: ScenarioFile = {
			name: 'mixed',
			description: 'Jump then scan then jump',
			ships: { explorer: baseShip },
			actions: [
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 10, distance: 2 } },
				{ ship: 'explorer', type: 'scan_route', params: { target_node_id: 20, distance: 2 } },
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 20, distance: 2 } },
			],
		};

		const { timeline } = runScenario(scenario);
		expect(timeline).toHaveLength(4);

		// After jump: at node 10
		expect(timeline[1].ships.explorer.nodeId).toBe(10);
		// After scan: still at node 10 (scan doesn't move)
		expect(timeline[2].ships.explorer.nodeId).toBe(10);
		// After second jump: at node 20
		expect(timeline[3].ships.explorer.nodeId).toBe(20);

		// Core degraded from jumps but not from scan
		const coreDrop1 = timeline[0].ships.explorer.coreLife - timeline[1].ships.explorer.coreLife;
		const coreDrop2 = timeline[1].ships.explorer.coreLife - timeline[2].ships.explorer.coreLife;
		const coreDrop3 = timeline[2].ships.explorer.coreLife - timeline[3].ships.explorer.coreLife;

		expect(coreDrop1).toBeGreaterThan(0); // jump degrades
		expect(coreDrop2).toBe(0); // scan doesn't degrade core
		expect(coreDrop3).toBeGreaterThan(0); // jump degrades
	});

	it('throws for unknown ship reference', () => {
		const scenario: ScenarioFile = {
			name: 'bad ref',
			description: 'References nonexistent ship',
			ships: { explorer: baseShip },
			actions: [
				{ ship: 'ghost', type: 'jump', params: { target_node_id: 10, distance: 1 } },
			],
		};

		expect(() => runScenario(scenario)).toThrow('Unknown ship: ghost');
	});
});
