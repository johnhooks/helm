import { describe, it, expect } from 'vitest';
import { simulate } from './engine';
import type { Scenario } from './types';

const baseShip = {
	hull: 'pioneer',
	core: 'epoch_s',
	drive: 'dr_505',
	sensor: 'vrs_mk1',
	shield: 'aegis_delta',
	nav: 'nav_tier_3',
};

describe('simulate', () => {
	it('produces initial snapshot at t=0', () => {
		const scenario: Scenario = {
			name: 'empty',
			description: 'No actions',
			ships: { ship1: baseShip },
			actions: [],
		};

		const snapshots = simulate(scenario);
		expect(snapshots.length).toBe(1);
		expect(snapshots[0].t).toBe(0);
		expect(snapshots[0].ships.ship1).toBeDefined();
		expect(snapshots[0].ships.ship1.power).toBe(100);
		expect(snapshots[0].ships.ship1.shield).toBe(100);
	});

	it('jump reduces core life and power', () => {
		const scenario: Scenario = {
			name: 'single jump',
			description: 'One jump',
			ships: { ship1: baseShip },
			actions: [
				{ t: 0, ship: 'ship1', type: 'jump', params: { distance: 3 } },
			],
		};

		const snapshots = simulate(scenario);
		expect(snapshots.length).toBe(2);

		const after = snapshots[1].ships.ship1;
		expect(after.coreLife).toBeLessThan(750);
		expect(after.power).toBeLessThan(100);
		expect(after.position).toBe(3);

		const jumpEvent = snapshots[1].events.find((e) => e.type === 'jump_complete');
		expect(jumpEvent).toBeDefined();
		if (jumpEvent?.type === 'jump_complete') {
			expect(jumpEvent.distance).toBe(3);
			expect(jumpEvent.coreCost).toBeGreaterThan(0);
		}
	});

	it('power regenerates over time between actions', () => {
		const scenario: Scenario = {
			name: 'power regen',
			description: 'Jump then wait',
			ships: { ship1: baseShip },
			actions: [
				{ t: 0, ship: 'ship1', type: 'jump', params: { distance: 3 } },
				{ t: 3600, ship: 'ship1', type: 'wait' },
			],
		};

		const snapshots = simulate(scenario);
		const afterJump = snapshots[1].ships.ship1.power;
		const afterWait = snapshots[2].ships.ship1.power;

		// Power should increase during the 1-hour wait
		expect(afterWait).toBeGreaterThan(afterJump);
	});

	it('shield regenerates over time', () => {
		const scenario: Scenario = {
			name: 'shield regen',
			description: 'Phaser drains shields, then they regen',
			ships: {
				attacker: {
					...baseShip,
					hull: 'striker',
					equipment: ['phaser_array'],
				},
				target: baseShip,
			},
			actions: [
				{ t: 0, ship: 'attacker', type: 'fire_phaser', params: { target: 'target', duration: 600 } },
				{ t: 3600, ship: 'target', type: 'wait' },
			],
		};

		const snapshots = simulate(scenario);
		const afterAttack = snapshots[1].ships.target.shield;
		expect(afterAttack).toBeLessThan(100);

		const afterRegen = snapshots[2].ships.target.shield;
		expect(afterRegen).toBeGreaterThan(afterAttack);
	});

	it('phaser drain depletes shields', () => {
		const scenario: Scenario = {
			name: 'phaser drain',
			description: 'Sustained phaser fire',
			ships: {
				attacker: {
					...baseShip,
					hull: 'striker',
					equipment: ['phaser_array'],
				},
				target: baseShip,
			},
			actions: [
				{ t: 0, ship: 'attacker', type: 'fire_phaser', params: { target: 'target', duration: 72000 } },
			],
		};

		const snapshots = simulate(scenario);
		const drainEvent = snapshots[1].events.find((e) => e.type === 'phaser_drain');
		expect(drainEvent).toBeDefined();
		if (drainEvent?.type === 'phaser_drain') {
			expect(drainEvent.shieldDrain).toBeGreaterThan(0);
		}
	});

	it('torpedo can hit and damage', () => {
		const scenario: Scenario = {
			name: 'torpedo hit',
			description: 'Single torpedo shot',
			ships: {
				attacker: {
					...baseShip,
					hull: 'specter',
					equipment: ['torpedo_launcher'],
				},
				target: baseShip,
			},
			actions: [
				{ t: 0, ship: 'attacker', type: 'fire_torpedo', params: { target: 'target' } },
			],
		};

		const snapshots = simulate(scenario);
		const torpedoEvent = snapshots[1].events.find((e) => e.type === 'torpedo_fired');
		expect(torpedoEvent).toBeDefined();

		// Ammo should be consumed
		expect(snapshots[1].ships.attacker.ammo.torpedo_launcher).toBe(3);
	});

	it('equipment activation is tracked', () => {
		const scenario: Scenario = {
			name: 'activate PDS',
			description: 'Activate equipment',
			ships: {
				ship1: {
					...baseShip,
					equipment: ['pds_mk1'],
				},
			},
			actions: [
				{ t: 0, ship: 'ship1', type: 'activate_pds' },
			],
		};

		const snapshots = simulate(scenario);
		expect(snapshots[1].ships.ship1.activeEquipment).toContain('pds_mk1');

		const event = snapshots[1].events.find((e) => e.type === 'equipment_activated');
		expect(event).toBeDefined();
	});

	it('chain of 5 jumps tracks cumulative core damage', () => {
		const scenario: Scenario = {
			name: 'jump chain',
			description: '5 sequential jumps',
			ships: { ship1: baseShip },
			actions: [
				{ t: 0, ship: 'ship1', type: 'jump', params: { distance: 3 } },
				{ t: 3600, ship: 'ship1', type: 'jump', params: { distance: 3 } },
				{ t: 7200, ship: 'ship1', type: 'jump', params: { distance: 3 } },
				{ t: 10800, ship: 'ship1', type: 'jump', params: { distance: 3 } },
				{ t: 14400, ship: 'ship1', type: 'jump', params: { distance: 3 } },
			],
		};

		const snapshots = simulate(scenario);
		expect(snapshots.length).toBe(6); // initial + 5 actions

		// Core life should decrease with each jump
		const coreLifes = snapshots.map((s) => s.ships.ship1.coreLife);
		for (let i = 1; i < coreLifes.length; i++) {
			expect(coreLifes[i]).toBeLessThan(coreLifes[i - 1]);
		}

		// Position should accumulate
		expect(snapshots[5].ships.ship1.position).toBe(15);
	});

	it('ECM reduces phaser effectiveness', () => {
		// Without ECM
		const scenarioNoEcm: Scenario = {
			name: 'no ECM',
			description: 'Phaser without ECM',
			ships: {
				attacker: { ...baseShip, hull: 'striker', equipment: ['phaser_array'] },
				target: baseShip,
			},
			actions: [
				{ t: 0, ship: 'attacker', type: 'fire_phaser', params: { target: 'target', duration: 3600 } },
			],
		};

		// With ECM
		const scenarioWithEcm: Scenario = {
			name: 'with ECM',
			description: 'Phaser vs ECM',
			ships: {
				attacker: { ...baseShip, hull: 'striker', equipment: ['phaser_array'] },
				target: { ...baseShip, equipment: ['ecm_mk1'] },
			},
			actions: [
				{ t: 0, ship: 'target', type: 'activate_ecm' },
				{ t: 1, ship: 'attacker', type: 'fire_phaser', params: { target: 'target', duration: 3600 } },
			],
		};

		const snapsNoEcm = simulate(scenarioNoEcm);
		const snapsWithEcm = simulate(scenarioWithEcm);

		const drainNoEcm = snapsNoEcm[1].events.find((e) => e.type === 'phaser_drain');
		const drainWithEcm = snapsWithEcm[2].events.find((e) => e.type === 'phaser_drain');

		expect(drainNoEcm?.type === 'phaser_drain' && drainNoEcm.shieldDrain).toBeGreaterThan(0);
		expect(drainWithEcm?.type === 'phaser_drain' && drainWithEcm.shieldDrain).toBeGreaterThan(0);

		if (drainNoEcm?.type === 'phaser_drain' && drainWithEcm?.type === 'phaser_drain') {
			expect(drainWithEcm.shieldDrain).toBeLessThan(drainNoEcm.shieldDrain);
		}
	});
});
