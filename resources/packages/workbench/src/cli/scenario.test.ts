import { describe, it, expect } from 'vitest';
import { runScenario } from './scenario';
import type { ScenarioFile } from './scenario';
import { ActionStatus } from '@helm/holodeck';

// Node IDs from graph.json (real star catalog):
// 1 = Sol (0,0,0)
// 2 = Proxima Centauri (1.296 ly from Sol) — direct jump
// 3 = Toliman (0.058 ly from Proxima) — direct jump
// 4 = Barnard's Star (1.975 ly from Toliman) — direct jump
// 9 = Ross 154
// 10 = Ross 248 (3.165 ly from Sol)

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

	it('scan then jump moves ship and degrades core', () => {
		const scenario: ScenarioFile = {
			name: 'scan and jump',
			description: 'Scan then jump to Proxima',
			ships: { explorer: baseShip },
			actions: [
				{ ship: 'explorer', type: 'scan_route', params: { target_node_id: 2 } },
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 2 } },
			],
		};

		const { timeline, actions } = runScenario(scenario);
		expect(timeline).toHaveLength(3);

		// Scan resolved
		expect(actions[0].status).toBe(ActionStatus.Fulfilled);
		expect(actions[0].result.success).toBe(true);

		// Jump resolved
		expect(actions[1].status).toBe(ActionStatus.Fulfilled);

		// Ship moved to Proxima (node 2)
		expect(timeline[2].ships.explorer.nodeId).toBe(2);

		// Core degraded
		expect(timeline[2].ships.explorer.coreLife).toBeLessThan(timeline[0].ships.explorer.coreLife);

		// Time advanced
		expect(timeline[2].t).toBeGreaterThan(0);
	});

	it('jump duration is computed from drive stats and distance', () => {
		const scenario: ScenarioFile = {
			name: 'two jumps',
			description: 'Short then long jump',
			ships: { explorer: baseShip },
			actions: [
				// Proxima is 1.296 ly from Sol
				{ ship: 'explorer', type: 'scan_route', params: { target_node_id: 2 } },
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 2 } },
				// Barnard's Star is 2.004 ly from Proxima
				{ ship: 'explorer', type: 'scan_route', params: { target_node_id: 4 } },
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 4 } },
			],
		};

		const { timeline } = runScenario(scenario);

		// First jump duration (scan + jump for each pair)
		const firstJumpStart = timeline[1].t; // after scan
		const firstJumpEnd = timeline[2].t; // after jump
		const secondJumpStart = timeline[3].t; // after scan
		const secondJumpEnd = timeline[4].t; // after jump

		const firstJumpDuration = firstJumpEnd - firstJumpStart;
		const secondJumpDuration = secondJumpEnd - secondJumpStart;

		// Longer distance = longer duration
		expect(secondJumpDuration).toBeGreaterThan(firstJumpDuration);
	});

	it('sequential jumps accumulate core degradation', () => {
		const scenario: ScenarioFile = {
			name: 'jump chain',
			description: '3 scan-and-jump pairs',
			ships: { explorer: baseShip },
			actions: [
				{ ship: 'explorer', type: 'scan_route', params: { target_node_id: 2 } },
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 2 } },
				{ ship: 'explorer', type: 'scan_route', params: { target_node_id: 3 } },
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 3 } },
				{ ship: 'explorer', type: 'scan_route', params: { target_node_id: 4 } },
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 4 } },
			],
		};

		const { timeline } = runScenario(scenario);
		expect(timeline).toHaveLength(7); // initial + 6 actions

		// Core life decreases with each jump (compare after each jump)
		const afterJump1 = timeline[2].ships.explorer.coreLife;
		const afterJump2 = timeline[4].ships.explorer.coreLife;
		const afterJump3 = timeline[6].ships.explorer.coreLife;

		expect(afterJump1).toBeLessThan(timeline[0].ships.explorer.coreLife);
		expect(afterJump2).toBeLessThan(afterJump1);
		expect(afterJump3).toBeLessThan(afterJump2);

		// Positions
		expect(timeline[2].ships.explorer.nodeId).toBe(2);
		expect(timeline[4].ships.explorer.nodeId).toBe(3);
		expect(timeline[6].ships.explorer.nodeId).toBe(4);
	});

	it('power regenerates during action durations', () => {
		const scenario: ScenarioFile = {
			name: 'power regen',
			description: 'Jump consumes power, then next snapshot shows regen',
			ships: { explorer: baseShip },
			actions: [
				{ ship: 'explorer', type: 'scan_route', params: { target_node_id: 2 } },
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 2 } },
				{ ship: 'explorer', type: 'scan_route', params: { target_node_id: 3 } },
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 3 } },
			],
		};

		const { timeline } = runScenario(scenario);

		// Power should not be zero — regen during action durations partially restores it
		const afterFirstJump = timeline[2].ships.explorer.power;
		const afterSecondJump = timeline[4].ships.explorer.power;

		expect(afterFirstJump).toBeGreaterThan(0);
		expect(afterSecondJump).toBeGreaterThan(0);
	});

	it('scan actions consume power and produce discovery results', () => {
		const scenario: ScenarioFile = {
			name: 'scan',
			description: 'Single scan',
			ships: { scanner: { ...baseShip, hull: 'surveyor' } },
			actions: [
				{ ship: 'scanner', type: 'scan_route', params: { target_node_id: 2 } },
			],
		};

		const { timeline, actions } = runScenario(scenario);
		expect(timeline).toHaveLength(2);

		// Action resolved
		expect(actions[0].status).toBe(ActionStatus.Fulfilled);

		// Result has success (with graph, close nodes produce direct edge)
		expect(actions[0].result.success).toBe(true);

		// Time advanced
		expect(timeline[1].t).toBeGreaterThan(0);
	});

	it('scan results are deterministic with seeded RNG', () => {
		const scenario: ScenarioFile = {
			name: 'deterministic scan',
			description: 'Same scenario twice',
			ships: { scanner: { ...baseShip, hull: 'surveyor' } },
			actions: [
				{ ship: 'scanner', type: 'scan_route', params: { target_node_id: 10 } },
			],
		};

		const run1 = runScenario(scenario);
		const run2 = runScenario(scenario);

		expect(run1.actions[0].result.success).toBe(run2.actions[0].result.success);
	});

	it('timestamps reflect real computed durations', () => {
		const scenario: ScenarioFile = {
			name: 'timing',
			description: 'Verify timestamps',
			ships: { explorer: baseShip },
			actions: [
				{ ship: 'explorer', type: 'scan_route', params: { target_node_id: 2 } },
				{ ship: 'explorer', type: 'scan_route', params: { target_node_id: 4 } },
			],
		};

		const { timeline } = runScenario(scenario);

		// t=0 is initial
		expect(timeline[0].t).toBe(0);

		// Each subsequent timestamp is positive
		expect(timeline[1].t).toBeGreaterThan(0);
		expect(timeline[2].t).toBeGreaterThan(timeline[1].t);
	});

	it('scan then jump then scan accumulates state correctly', () => {
		const scenario: ScenarioFile = {
			name: 'mixed',
			description: 'Scan, jump, then scan from new position',
			ships: { explorer: baseShip },
			actions: [
				{ ship: 'explorer', type: 'scan_route', params: { target_node_id: 2 } },
				{ ship: 'explorer', type: 'jump', params: { target_node_id: 2 } },
				{ ship: 'explorer', type: 'scan_route', params: { target_node_id: 3 } },
			],
		};

		const { timeline } = runScenario(scenario);
		expect(timeline).toHaveLength(4);

		// After scan: still at node 1
		expect(timeline[1].ships.explorer.nodeId).toBe(1);
		// After jump: at node 2
		expect(timeline[2].ships.explorer.nodeId).toBe(2);
		// After second scan: still at node 2 (scan doesn't move)
		expect(timeline[3].ships.explorer.nodeId).toBe(2);

		// Core degraded from jump but not from scans
		const coreDrop1 = timeline[0].ships.explorer.coreLife - timeline[1].ships.explorer.coreLife;
		const coreDrop2 = timeline[1].ships.explorer.coreLife - timeline[2].ships.explorer.coreLife;
		const coreDrop3 = timeline[2].ships.explorer.coreLife - timeline[3].ships.explorer.coreLife;

		expect(coreDrop1).toBe(0); // scan doesn't degrade core
		expect(coreDrop2).toBeGreaterThan(0); // jump degrades
		expect(coreDrop3).toBe(0); // scan doesn't degrade core
	});

	it('phaser attack drains target shields', () => {
		const scenario: ScenarioFile = {
			name: 'phaser test',
			description: 'Phaser drains shields',
			ships: {
				wolf: {
					hull: 'striker',
					core: 'epoch_s',
					drive: 'dr_505',
					sensor: 'vrs_mk1',
					shield: 'aegis_delta',
					nav: 'nav_tier_3',
					equipment: ['phaser_array'],
					node: 1,
				},
				miner: { ...baseShip, node: 1 },
			},
			actions: [
				{ ship: 'wolf', type: 'fire_phaser', params: { target_ship_id: 'miner', duration: 600 } },
			],
		};

		const { timeline, actions } = runScenario(scenario);
		expect(actions[0].status).toBe(ActionStatus.Fulfilled);

		// Target shields should be drained
		expect(timeline[1].ships.miner.shield).toBeLessThan(timeline[0].ships.miner.shield);
	});

	it('torpedo attack consumes ammo', () => {
		const scenario: ScenarioFile = {
			name: 'torpedo test',
			description: 'Torpedo consumes ammo',
			ships: {
				wolf: {
					hull: 'specter',
					core: 'epoch_s',
					drive: 'dr_505',
					sensor: 'vrs_mk1',
					shield: 'aegis_delta',
					nav: 'nav_tier_3',
					equipment: ['torpedo_launcher'],
					node: 1,
				},
				miner: { ...baseShip, node: 1 },
			},
			actions: [
				{ ship: 'wolf', type: 'fire_torpedo', params: { target_ship_id: 'miner' } },
			],
		};

		const { timeline, actions } = runScenario(scenario);
		expect(actions[0].status).toBe(ActionStatus.Fulfilled);

		// Ammo consumed (torpedo_launcher capacity is 4, so should be 3 after firing)
		const startAmmo = timeline[0].ships.wolf.ammo.torpedo_launcher ?? 0;
		const endAmmo = timeline[1].ships.wolf.ammo.torpedo_launcher ?? 0;
		expect(endAmmo).toBe(startAmmo - 1);
	});

	it('equipment activation shows in snapshot', () => {
		const scenario: ScenarioFile = {
			name: 'equipment test',
			description: 'PDS activation appears in snapshot',
			ships: {
				miner: {
					hull: 'pioneer',
					core: 'epoch_s',
					drive: 'dr_505',
					sensor: 'vrs_mk1',
					shield: 'aegis_delta',
					nav: 'nav_tier_3',
					equipment: ['mining_laser', 'pds_mk1'],
					node: 1,
				},
			},
			actions: [
				{ ship: 'miner', type: 'activate_equipment', params: { equipment_slug: 'pds_mk1' } },
			],
		};

		const { timeline } = runScenario(scenario);
		expect(timeline).toHaveLength(2);

		// No active equipment initially
		expect(timeline[0].ships.miner.activeEquipment).toEqual([]);

		// PDS active after activation
		expect(timeline[1].ships.miner.activeEquipment).toContain('pds_mk1');
	});

	it('multi-ship combat scenario with equipment', () => {
		const scenario: ScenarioFile = {
			name: 'combat sequence',
			description: 'ECM activation then phaser attack',
			ships: {
				wolf: {
					hull: 'striker',
					core: 'epoch_s',
					drive: 'dr_505',
					sensor: 'vrs_mk1',
					shield: 'aegis_delta',
					nav: 'nav_tier_3',
					equipment: ['phaser_array'],
					node: 1,
				},
				prey: {
					hull: 'pioneer',
					core: 'epoch_s',
					drive: 'dr_505',
					sensor: 'vrs_mk1',
					shield: 'aegis_delta',
					nav: 'nav_tier_3',
					equipment: ['ecm_mk1', 'mining_laser'],
					node: 1,
				},
			},
			actions: [
				{ ship: 'prey', type: 'activate_equipment', params: { equipment_slug: 'ecm_mk1' } },
				{ ship: 'wolf', type: 'fire_phaser', params: { target_ship_id: 'prey', duration: 600 } },
			],
		};

		const { timeline, actions } = runScenario(scenario);

		// ECM activation is a mutation, not an engine action
		// Only the phaser fire is in the actions array
		expect(actions).toHaveLength(1);
		expect(actions[0].status).toBe(ActionStatus.Fulfilled);

		// ECM should reduce phaser drain (shields should be higher than without ECM)
		expect(timeline[2].ships.prey.shield).toBeLessThan(timeline[0].ships.prey.shield);

		// ECM is active
		expect(timeline[1].ships.prey.activeEquipment).toContain('ecm_mk1');
	});

	it('sequential torpedo attacks deplete ammo', () => {
		const scenario: ScenarioFile = {
			name: 'ammo depletion',
			description: 'Fire all torpedoes',
			ships: {
				wolf: {
					hull: 'specter',
					core: 'epoch_s',
					drive: 'dr_505',
					sensor: 'vrs_mk1',
					shield: 'aegis_delta',
					nav: 'nav_tier_3',
					equipment: ['torpedo_launcher'],
					node: 1,
				},
				miner: { ...baseShip, node: 1 },
			},
			actions: [
				{ ship: 'wolf', type: 'fire_torpedo', params: { target_ship_id: 'miner' } },
				{ ship: 'wolf', type: 'fire_torpedo', params: { target_ship_id: 'miner' } },
				{ ship: 'wolf', type: 'fire_torpedo', params: { target_ship_id: 'miner' } },
				{ ship: 'wolf', type: 'fire_torpedo', params: { target_ship_id: 'miner' } },
			],
		};

		const { timeline, actions } = runScenario(scenario);
		expect(actions).toHaveLength(4);

		// All 4 torpedoes fired, ammo should be 0
		const finalAmmo = timeline.at(-1)!.ships.wolf.ammo.torpedo_launcher ?? 0;
		expect(finalAmmo).toBe(0);
	});

	it('throws for unknown ship reference', () => {
		const scenario: ScenarioFile = {
			name: 'bad ref',
			description: 'References nonexistent ship',
			ships: { explorer: baseShip },
			actions: [
				{ ship: 'ghost', type: 'scan_route', params: { target_node_id: 2 } },
			],
		};

		expect(() => runScenario(scenario)).toThrow('Unknown ship: ghost');
	});

	describe('passive scan actions', () => {
		it('scan_passive returns detections in timeline', () => {
			const scenario: ScenarioFile = {
				name: 'detection query',
				description: 'Damaged target emits shield_regen, listener detects',
				ships: {
					target: { ...baseShip },
					listener: { ...baseShip, hull: 'surveyor', sensor: 'dsc_mk1', passive_scan_interval: 7200 },
				},
				actions: [
					{ ship: 'target', type: 'absorb_damage', params: { amount: 30 } },
					{ ship: 'listener', type: 'scan_passive' },
				],
			};

			const { timeline } = runScenario(scenario);
			// Initial + absorb_damage + passive scan = 3 entries
			expect(timeline).toHaveLength(3);

			const queryResult = timeline[2].result!;
			expect(queryResult.detections).toBeDefined();
			expect(queryResult.integration_seconds).toBe(7200);
			expect(queryResult.noise_floor).toBeDefined();
		});

		it('scan_passive advances clock to nextPassiveScanAt when needed', () => {
			const scenario: ScenarioFile = {
				name: 'clock advance',
				description: 'Passive scan waits for scheduled time',
				ships: {
					target: { ...baseShip },
					listener: { ...baseShip, hull: 'surveyor', sensor: 'dsc_mk1' },
				},
				actions: [
					{ ship: 'target', type: 'absorb_damage', params: { amount: 30 } },
					{ ship: 'listener', type: 'scan_passive' },
				],
			};

			const { timeline } = runScenario(scenario);
			// absorb_damage is instant (t=0), so clock advances to nextPassiveScanAt (300)
			expect(timeline[2].t).toBeGreaterThanOrEqual(300);
		});

		it('ECM prevents passive detection in scenario', () => {
			const scenario: ScenarioFile = {
				name: 'ecm impact',
				description: 'ECM drowns out faint signals',
				ships: {
					target: { ...baseShip },
					jammer: { ...baseShip, equipment: ['ecm_mk1'] },
					listener: { ...baseShip, hull: 'surveyor', sensor: 'dsc_mk1', passive_scan_interval: 7200 },
				},
				actions: [
					{ ship: 'target', type: 'absorb_damage', params: { amount: 30 } },
					{ ship: 'listener', type: 'scan_passive' },
					{ ship: 'jammer', type: 'activate_equipment', params: { equipment_slug: 'ecm_mk1' } },
					{ ship: 'listener', type: 'scan_passive' },
				],
			};

			const { timeline } = runScenario(scenario);
			const beforeEcm = timeline[2].result!;
			const afterEcm = timeline[4].result!;

			// Before ECM: shield_regen detected
			expect((beforeEcm.detections as unknown[]).length).toBeGreaterThan(0);

			// After ECM: signal drowned out, no detections
			expect((afterEcm.detections as unknown[]).length).toBe(0);
		});

		it('absorb_damage creates shield regen emission detectable by listener', () => {
			const scenario: ScenarioFile = {
				name: 'shield regen detection',
				description: 'Damaged ship emits shield_regen, listener detects',
				ships: {
					target: { ...baseShip },
					listener: { ...baseShip, hull: 'surveyor', sensor: 'dsc_mk1', passive_scan_interval: 7200 },
				},
				actions: [
					{ ship: 'target', type: 'absorb_damage', params: { amount: 30 } },
					{ ship: 'listener', type: 'scan_passive' },
				],
			};

			const { timeline } = runScenario(scenario);
			const queryResult = timeline[2].result!;
			expect((queryResult.source_count as number)).toBeGreaterThan(0);
		});
	});
});
