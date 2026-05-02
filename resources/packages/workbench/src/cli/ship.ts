/**
 * Ship command — resolve a holodeck Ship and dump state + capabilities.
 *
 * bun run wb ship [--hull=pioneer] [--core=epoch_s]
 */

import { createShip, createClock, createRng } from '@helm/holodeck';
import type { ParsedFlags } from './parse';
import { hydrateLoadout, loadoutSlugs, resolvePilot } from './parse';
import { r } from '../format';

export function ship({ flags }: ParsedFlags): void {
	const loadout = hydrateLoadout(flags);
	const pilot = resolvePilot(flags);

	const time = flags.time ? parseFloat(flags.time) : 0;

	const clock = createClock(time);
	const rng = createRng(42);
	const s = createShip(loadout, clock, rng, {
		powerFullAt: flags['power-at']
			? parseFloat(flags['power-at'])
			: undefined,
		shieldsFullAt: flags['shields-at']
			? parseFloat(flags['shields-at'])
			: undefined,
		hullIntegrity: flags['hull-integrity']
			? parseFloat(flags['hull-integrity'])
			: undefined,
		coreLife: flags['core-life']
			? parseFloat(flags['core-life'])
			: undefined,
		pilot,
	});

	const state = s.resolve();

	// Tuning sweep values
	const tuningSweep = [0.5, 1.0, 2.0];

	// Sample distances for jump/scan tables
	const jumpDistances = [2, 5, 10, 15, 20];
	const scanDistances = [3, 5, 8];
	const depthSamples = [0, 1, 3, 5];

	const output = {
		loadout: loadoutSlugs(loadout),
		config: { time, pilot },
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
		tuningSweep: {
			throttle: tuningSweep.map((throttle) => ({
				throttle,
				jumps: jumpDistances.map((d) => ({
					distance: d,
					duration: s.propulsion.getJumpDuration(d, throttle),
					coreCost: r(s.propulsion.getJumpCoreCost(d, throttle)),
				})),
			})),
			effort: tuningSweep.map((effort) => ({
				effort,
				scans: scanDistances.map((d) => ({
					distance: d,
					duration: s.sensors.getScanDuration(d, effort),
					successChance: r(s.sensors.getScanSuccessChance(d, effort)),
				})),
			})),
			priority: tuningSweep.map((priority) => {
				const ps = createShip(
					loadout,
					createClock(time),
					createRng(42),
					{
						shieldPriority: priority,
					}
				);
				return {
					priority,
					regenRate: r(ps.shields.getRegenRate()),
				};
			}),
		},
	};

	console.log(JSON.stringify(output, null, 2)); // eslint-disable-line no-console
}
