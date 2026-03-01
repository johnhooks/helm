/**
 * Combat command — quick combat scenario without writing JSON.
 *
 * bun run wb combat --attacker=striker --weapon=phaser_array --defender=pioneer --shield=aegis_delta
 */

import { simulate } from '../sim/engine';
import type { Scenario, ScenarioShip, SimAction } from '../sim/types';
import type { ParsedFlags } from './parse';

const DEFAULT_SHIP: ScenarioShip = {
	hull: 'pioneer',
	core: 'epoch_s',
	drive: 'dr_505',
	sensor: 'vrs_mk1',
	shield: 'aegis_delta',
	nav: 'nav_tier_3',
};

export function combat({ flags }: ParsedFlags): void {
	const attackerHull = flags.attacker ?? 'striker';
	const defenderHull = flags.defender ?? 'pioneer';
	const weapon = flags.weapon ?? 'phaser_array';
	const defenseEquip = flags.defense;
	const shieldSlug = flags.shield ?? 'aegis_delta';
	const rounds = parseInt(flags.rounds ?? '4', 10);
	const interval = parseInt(flags.interval ?? '3600', 10);

	const attacker: ScenarioShip = {
		...DEFAULT_SHIP,
		hull: attackerHull,
		equipment: [weapon],
	};

	const defender: ScenarioShip = {
		...DEFAULT_SHIP,
		hull: defenderHull,
		shield: shieldSlug,
		equipment: defenseEquip ? [defenseEquip] : [],
	};

	const actions: SimAction[] = [];

	// Activate defense if present
	if (defenseEquip) {
		const activateMap: Record<string, SimAction['type']> = {
			pds_mk1: 'activate_pds',
			ecm_mk1: 'activate_ecm',
			veil_array: 'activate_veil',
		};
		const activateType = activateMap[defenseEquip];
		if (activateType) {
			actions.push({ t: 0, ship: 'defender', type: activateType });
		}
	}

	// Generate attack rounds
	const isPhaser = weapon === 'phaser_array';
	for (let i = 0; i < rounds; i++) {
		const t = (i * interval) + 1; // offset by 1s if defense activated at t=0
		if (isPhaser) {
			actions.push({
				t,
				ship: 'attacker',
				type: 'fire_phaser',
				params: { target: 'defender', duration: interval },
			});
		} else {
			actions.push({
				t,
				ship: 'attacker',
				type: 'fire_torpedo',
				params: { target: 'defender' },
			});
		}
	}

	const scenario: Scenario = {
		name: `Quick Combat: ${attackerHull} (${weapon}) vs ${defenderHull}`,
		description: `Auto-generated ${rounds}-round combat scenario.`,
		ships: { attacker, defender },
		actions,
	};

	const snapshots = simulate(scenario);

	const output = {
		scenario: scenario.name,
		attacker: { hull: attackerHull, weapon },
		defender: { hull: defenderHull, shield: shieldSlug, defense: defenseEquip ?? 'none' },
		rounds,
		timeline: snapshots,
	};

	console.log(JSON.stringify(output, null, 2)); // eslint-disable-line no-console
}
