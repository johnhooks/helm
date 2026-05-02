import { describe, it, expect } from 'vitest';
import { createShip } from './factory';
import { createClock } from './clock';
import { createRng } from './rng';
import { makeLoadout, makeProduct, makeComponent } from './test-helpers';

function setup(config?: Parameters<typeof createShip>[3]) {
	const loadout = makeLoadout();
	const clock = createClock();
	const rng = createRng(42);
	const ship = createShip(loadout, clock, rng, config);
	return { ship, clock, loadout };
}

function setupWithEquipment(config?: Parameters<typeof createShip>[3]) {
	const pds = makeProduct({
		slug: 'pds_mk1',
		type: 'equipment',
		mult_a: 0.45,
	});
	const ecm = makeProduct({
		slug: 'ecm_mk1',
		type: 'equipment',
		mult_a: 0.3,
	});
	const loadout = makeLoadout({
		equipment: [
			makeComponent(pds, 'equip_1'),
			makeComponent(ecm, 'equip_2'),
		],
	});
	const clock = createClock();
	const rng = createRng(42);
	const ship = createShip(loadout, clock, rng, config);
	return { ship, clock, loadout };
}

describe('Ship', () => {
	describe('resolve', () => {
		it('produces a complete ShipState snapshot', () => {
			const { ship } = setup();
			const state = ship.resolve();

			expect(state.id).toBe('ship-1');
			expect(state.power).toBe(100);
			expect(state.powerMax).toBe(100);
			expect(state.shield).toBe(50);
			expect(state.shieldMax).toBe(50);
			expect(state.hull).toBe(100);
			expect(state.hullMax).toBe(100);
			expect(state.coreLife).toBe(500);
			expect(state.nodeId).toBeNull();
			expect(state.shieldPriority).toBe(1.0);
			expect(state.cargo).toEqual({});
			expect(state.ammo).toEqual({});
			expect(state.activeEquipment).toEqual([]);
			expect(state.pilot).toEqual({
				scanning: 1.0,
				jumping: 1.0,
				trading: 1.0,
				mining: 1.0,
				salvaging: 1.0,
				phasers: 1.0,
				torpedoes: 1.0,
			});
		});

		it('reflects current clock time for power/shields', () => {
			const { ship, clock } = setup({ powerFullAt: 3600 });
			// At t=0: power = 100 - (1hr * 10/hr) = 90
			expect(ship.resolve().power).toBe(90);
			// Advance 30 minutes: power = 100 - (0.5hr * 10) = 95
			clock.advanceTo(1800);
			expect(ship.resolve().power).toBe(95);
			// Advance past fullAt: power = 100
			clock.advanceTo(4000);
			expect(ship.resolve().power).toBe(100);
		});
	});

	describe('consumePower', () => {
		it('reduces available power and sets fullAt', () => {
			const { ship } = setup();
			ship.consumePower(50);
			const state = ship.resolve();
			expect(state.power).toBe(50);
		});

		it('power regenerates over time', () => {
			const { ship, clock } = setup();
			ship.consumePower(50);
			// After consuming 50: deficit=50, rate=10/hr, fullAt=18000s
			clock.advanceTo(9000); // half way → recovered 25
			expect(ship.resolve().power).toBe(75);
		});
	});

	describe('absorbDamage', () => {
		it('shields absorb damage first', () => {
			const { ship } = setup();
			const result = ship.absorbDamage(30);
			expect(result.shieldAbsorbed).toBe(30);
			expect(result.hullDamage).toBe(0);
			expect(ship.resolve().hull).toBe(100);
		});

		it('overflow damages hull', () => {
			const { ship } = setup();
			const result = ship.absorbDamage(70);
			expect(result.shieldAbsorbed).toBe(50);
			expect(result.hullDamage).toBe(20);
			expect(ship.resolve().hull).toBe(80);
		});

		it('shields regenerate after damage', () => {
			const { ship, clock } = setup();
			ship.absorbDamage(25);
			// Shield took 25 damage: deficit=25, rate=5/hr, fullAt=18000s
			expect(ship.resolve().shield).toBe(25);
			clock.advanceTo(9000); // halfway → recovered 12.5
			expect(ship.resolve().shield).toBeCloseTo(37.5);
		});
	});

	describe('degradeCore', () => {
		it('reduces core life', () => {
			const { ship } = setup();
			ship.degradeCore(100);
			expect(ship.resolve().coreLife).toBe(400);
		});

		it('clamps to 0', () => {
			const { ship } = setup();
			ship.degradeCore(999);
			expect(ship.resolve().coreLife).toBe(0);
			expect(ship.power.isDepleted()).toBe(true);
		});
	});

	describe('moveToNode', () => {
		it('updates position', () => {
			const { ship } = setup();
			ship.moveToNode(42);
			expect(ship.resolve().nodeId).toBe(42);
		});
	});

	describe('repairHull', () => {
		it('restores hull integrity', () => {
			const { ship } = setup({ hullIntegrity: 50 });
			ship.repairHull(30);
			expect(ship.resolve().hull).toBe(80);
		});

		it('clamps to max', () => {
			const { ship } = setup({ hullIntegrity: 90 });
			ship.repairHull(50);
			expect(ship.resolve().hull).toBe(100);
		});
	});

	describe('setShieldPriority', () => {
		it('changes shield priority', () => {
			const { ship } = setup();
			ship.setShieldPriority(2.0);
			expect(ship.resolve().shieldPriority).toBe(2.0);
		});

		it('recalculates shieldsFullAt with new regen rate', () => {
			const { ship, clock } = setup();
			// Damage shields first to create a deficit
			ship.absorbDamage(25);
			// Shield at 25/50, rate=5/hr, fullAt=18000s

			// Now double priority → rate becomes 10/hr
			ship.setShieldPriority(2.0);
			expect(ship.shields.getRegenRate()).toBe(10);

			// Recovery should be faster: deficit=25, rate=10/hr → 9000s
			clock.advanceTo(4500); // quarter of old time, half of new time
			expect(ship.resolve().shield).toBeCloseTo(37.5);
		});

		it('sets shieldsFullAt to null when shields are full', () => {
			const { ship } = setup();
			ship.setShieldPriority(2.0);
			// Shields already at max, so shieldsFullAt should remain null
			expect(ship.resolve().shield).toBe(50);
		});
	});

	describe('cargo mutations', () => {
		it('addCargo adds to inventory', () => {
			const { ship } = setup();
			ship.addCargo('ore', 10);
			ship.addCargo('ore', 5);
			ship.addCargo('gas', 3);
			expect(ship.resolve().cargo).toEqual({ ore: 15, gas: 3 });
		});

		it('removeCargo returns amount removed', () => {
			const { ship } = setup({ cargo: { ore: 10 } });
			expect(ship.removeCargo('ore', 7)).toBe(7);
			expect(ship.resolve().cargo).toEqual({ ore: 3 });
		});

		it('removeCargo clamps to available and cleans up', () => {
			const { ship } = setup({ cargo: { ore: 5 } });
			expect(ship.removeCargo('ore', 10)).toBe(5);
			expect(ship.resolve().cargo).toEqual({});
		});

		it('removeCargo returns 0 for unknown slug', () => {
			const { ship } = setup();
			expect(ship.removeCargo('nothing', 5)).toBe(0);
		});
	});

	describe('ammo mutations', () => {
		it('consumeAmmo decrements and returns true', () => {
			const { ship } = setup({ ammo: { torpedo: 5 } });
			expect(ship.consumeAmmo('torpedo')).toBe(true);
			expect(ship.resolve().ammo).toEqual({ torpedo: 4 });
		});

		it('consumeAmmo returns false when insufficient', () => {
			const { ship } = setup({ ammo: { torpedo: 1 } });
			expect(ship.consumeAmmo('torpedo', 2)).toBe(false);
			expect(ship.resolve().ammo).toEqual({ torpedo: 1 });
		});

		it('consumeAmmo cleans up when exhausted', () => {
			const { ship } = setup({ ammo: { torpedo: 1 } });
			ship.consumeAmmo('torpedo');
			expect(ship.resolve().ammo).toEqual({});
		});
	});

	describe('equipment activation', () => {
		it('activateEquipment adds to active set', () => {
			const { ship } = setupWithEquipment();
			ship.activateEquipment('pds_mk1');
			expect(ship.isEquipmentActive('pds_mk1')).toBe(true);
			expect(ship.isEquipmentActive('ecm_mk1')).toBe(false);
			expect(ship.resolve().activeEquipment).toEqual(['pds_mk1']);
		});

		it('deactivateEquipment removes from active set', () => {
			const { ship } = setupWithEquipment();
			ship.activateEquipment('pds_mk1');
			ship.activateEquipment('ecm_mk1');
			ship.deactivateEquipment('pds_mk1');
			expect(ship.isEquipmentActive('pds_mk1')).toBe(false);
			expect(ship.isEquipmentActive('ecm_mk1')).toBe(true);
			expect(ship.resolve().activeEquipment).toEqual(['ecm_mk1']);
		});

		it('activateEquipment throws for unknown slug', () => {
			const { ship } = setupWithEquipment();
			expect(() => ship.activateEquipment('nonexistent')).toThrow(
				'Equipment "nonexistent" not in loadout'
			);
		});

		it('getActiveEquipment returns current active list', () => {
			const { ship } = setupWithEquipment();
			expect(ship.getActiveEquipment()).toEqual([]);
			ship.activateEquipment('pds_mk1');
			ship.activateEquipment('ecm_mk1');
			expect(ship.getActiveEquipment()).toEqual(['pds_mk1', 'ecm_mk1']);
		});

		it('resolve includes activeEquipment', () => {
			const { ship } = setupWithEquipment();
			expect(ship.resolve().activeEquipment).toEqual([]);
			ship.activateEquipment('ecm_mk1');
			expect(ship.resolve().activeEquipment).toEqual(['ecm_mk1']);
		});

		it('createClone preserves active equipment', () => {
			const { ship } = setupWithEquipment();
			ship.activateEquipment('pds_mk1');
			const clone = ship.createClone(createClock(), createRng(0));
			expect(clone.isEquipmentActive('pds_mk1')).toBe(true);
			expect(clone.resolve().activeEquipment).toEqual(['pds_mk1']);
		});

		it('config activeEquipment initializes active set', () => {
			const { ship } = setupWithEquipment({
				activeEquipment: ['pds_mk1', 'ecm_mk1'],
			});
			expect(ship.isEquipmentActive('pds_mk1')).toBe(true);
			expect(ship.isEquipmentActive('ecm_mk1')).toBe(true);
			expect(ship.resolve().activeEquipment).toEqual([
				'pds_mk1',
				'ecm_mk1',
			]);
		});
	});
});
