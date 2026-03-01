/**
 * Ship command — resolve a holodeck Ship and dump state + capabilities.
 *
 * bun run wb ship [--hull=pioneer] [--core=epoch_s] [--mode=overdrive]
 */

import { createShip, createClock, createRng, PowerMode } from '@helm/holodeck';
import type { ParsedFlags } from './parse';
import { hydrateLoadout, resolveTuning, loadoutSlugs } from './parse';
import { r } from '../format';

export function ship({ flags }: ParsedFlags): void {
	const loadout = hydrateLoadout(flags);
	const tuning = resolveTuning(flags);

	const mode = (flags.mode as PowerMode) ?? PowerMode.Normal;
	const time = flags.time ? parseFloat(flags.time) : 0;

	const clock = createClock(time);
	const rng = createRng(42);
	const s = createShip(loadout, clock, rng, {
		powerMode: mode,
		tuning,
		powerFullAt: flags['power-at'] ? parseFloat(flags['power-at']) : undefined,
		shieldsFullAt: flags['shields-at'] ? parseFloat(flags['shields-at']) : undefined,
		hullIntegrity: flags['hull-integrity'] ? parseFloat(flags['hull-integrity']) : undefined,
		coreLife: flags['core-life'] ? parseFloat(flags['core-life']) : undefined,
	});

	const state = s.resolve();

	// Sample distances for jump/scan tables
	const jumpDistances = [2, 5, 10, 15, 20];
	const scanDistances = [3, 5, 8];
	const depthSamples = [0, 1, 3, 5];

	// Power mode comparison
	const modeComparison: Record<string, unknown> = {};
	for (const m of [PowerMode.Efficiency, PowerMode.Normal, PowerMode.Overdrive]) {
		const ms = createShip(loadout, createClock(time), createRng(42), { powerMode: m, tuning });
		modeComparison[m] = {
			output: r(ms.power.getOutputMultiplier()),
			regen: r(ms.power.getRegenRate()),
			decay: ms.power.getDecayMultiplier(),
			scanRange: r(ms.sensors.getRange()),
			jumpComfort: r(ms.propulsion.getComfortRange()),
		};
	}

	const output = {
		loadout: loadoutSlugs(loadout),
		config: { powerMode: mode, time },
		state: {
			power: r(state.power),
			powerMax: r(state.powerMax),
			shield: r(state.shield),
			shieldMax: r(state.shieldMax),
			hull: r(state.hull),
			hullMax: r(state.hullMax),
			coreLife: r(state.coreLife),
		},
		systems: {
			power: {
				regenRate: r(s.power.getRegenRate()),
				outputMultiplier: r(s.power.getOutputMultiplier()),
				decayMultiplier: s.power.getDecayMultiplier(),
			},
			propulsion: {
				performanceRatio: r(s.propulsion.getPerformanceRatio()),
				comfortRange: r(s.propulsion.getComfortRange()),
				sampleJumps: jumpDistances.map((d) => ({
					distance: d,
					duration: s.propulsion.getJumpDuration(d),
					coreCost: r(s.propulsion.getJumpCoreCost(d)),
					powerCost: r(s.propulsion.getJumpPowerCost(d)),
					reachable: s.propulsion.canReach(d),
				})),
			},
			sensors: {
				range: r(s.sensors.getRange()),
				comfortRange: r(s.sensors.getComfortRange()),
				sampleScans: scanDistances.map((d) => ({
					distance: d,
					powerCost: r(s.sensors.getScanPowerCost(d)),
					duration: s.sensors.getScanDuration(d),
					successChance: r(s.sensors.getScanSuccessChance(d)),
				})),
			},
			shields: {
				regenRate: r(s.shields.getRegenRate()),
				maxStrength: r(s.shields.getMaxStrength()),
			},
			hull: {
				integrity: r(s.hull.getIntegrity()),
				maxIntegrity: r(s.hull.getMaxIntegrity()),
				critical: s.hull.isCritical(),
				destroyed: s.hull.isDestroyed(),
			},
			navigation: {
				skill: r(s.navigation.getSkill()),
				efficiency: r(s.navigation.getEfficiency()),
				discoveryByDepth: depthSamples.map((depth) => ({
					depth,
					probability: r(s.navigation.getDiscoveryProbability(depth)),
				})),
			},
			cargo: {
				items: s.cargo.all(),
				total: s.cargo.total(),
				ammo: s.cargo.allAmmo(),
			},
		},
		powerModeComparison: modeComparison,
	};

	console.log(JSON.stringify(output, null, 2)); // eslint-disable-line no-console
}
