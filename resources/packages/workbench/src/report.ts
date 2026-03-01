import type { ActionTuning, Constants } from '@helm/formulas';
import {
	coreOutput, regenRate, perfRatio, capacitor,
	scanComfortRange, scanPowerCost, scanDuration, scanSuccessChance,
	strainFactor, jumpComfortRange, jumpDuration, jumpCoreCost, jumpPowerCost,
	shieldRegenRate, shieldDraw, shieldTimeToFull,
	discoveryProbability,
	transitShieldRegenRate, transitShieldRecovered,
	coreResonanceCost, sensorShieldCouplingMultiplier,
} from '@helm/formulas';
import type { Loadout, ShipReport } from './types';

function formatFootprint(loadout: Loadout): ShipReport['footprint'] {
	const breakdown: Record<string, number> = {
		core: loadout.core.footprint,
		drive: loadout.drive.footprint,
		sensor: loadout.sensor.footprint,
		shield: loadout.shield.footprint,
		nav: loadout.nav.footprint,
	};
	const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
	return {
		total,
		budget: loadout.hull.internalSpace,
		cargo: loadout.hull.internalSpace - total,
		breakdown,
	};
}

function formatPower(loadout: Loadout): ShipReport['power'] {
	const output = coreOutput(loadout.core);
	const ratio = perfRatio(output, loadout.drive);
	const regen = regenRate(loadout.core);
	const life = loadout.core.hp ?? 0;
	return {
		coreOutput: output,
		capacitor: capacitor(loadout.core),
		perfRatio: ratio,
		regenRate: regen,
		coreLife: life,
	};
}

function formatScan(loadout: Loadout, output: number, effort: number, constants: Constants): ShipReport['scan'] {
	const comfort = scanComfortRange(loadout.sensor, output);
	const durationPerLy = Math.ceil(constants.baseScanSecondsPerLy * (loadout.sensor.mult_a ?? 0) * effort);
	const baseChance = loadout.sensor.chance ?? 0;

	const sampleDistances = [1, 2, 3, 5, Math.floor(comfort), Math.floor(comfort * 1.5)].filter(
		(d, i, arr) => d > 0 && arr.indexOf(d) === i,
	);

	return {
		comfortRange: comfort,
		powerCostPerLy: constants.baseScanPowerPerLy,
		durationPerLy,
		successChance: baseChance,
		sampleScans: sampleDistances.map((d) => ({
			distance: d,
			cost: scanPowerCost(d, constants, comfort),
			duration: scanDuration(d, loadout.sensor, effort, constants),
			strain: strainFactor(d, comfort),
			chance: scanSuccessChance(loadout.sensor, d, comfort, effort),
		})),
	};
}

function formatJump(
	loadout: Loadout,
	output: number,
	ratio: number,
	throttle: number,
	constants: Constants,
): ShipReport['jump'] {
	const rawComfort = jumpComfortRange(loadout.drive, output, ratio);
	const comfort = rawComfort / loadout.hull.hullMass;
	const costPerLy = throttle <= 0.5
		? 0
		: (loadout.core.mult_b ?? 0) * (loadout.drive.mult_b ?? 0) * throttle;
	const powerPerLy = constants.baseJumpPowerPerLy;

	const amplitudeMult = loadout.hull.amplitudeMultiplier ?? 1.0;

	const sampleDistances = [1, 2, 3, 5, Math.floor(comfort), Math.floor(comfort * 1.5)].filter(
		(d, i, arr) => d > 0 && arr.indexOf(d) === i,
	);

	return {
		comfortRange: comfort,
		coreCostPerLy: costPerLy,
		powerCostPerLy: powerPerLy,
		sampleJumps: sampleDistances.map((d) => ({
			distance: d,
			duration: jumpDuration(d, loadout.drive, output * amplitudeMult, ratio, throttle, constants),
			coreCost: jumpCoreCost(d, loadout.core, loadout.drive, throttle, comfort),
			powerCost: jumpPowerCost(d, constants, comfort),
			strain: strainFactor(d, comfort),
		})),
	};
}

function formatShield(loadout: Loadout, priority: number): ShipReport['shield'] {
	const capacity = loadout.shield.capacity ?? 0;
	const regen = shieldRegenRate(loadout.shield.rate ?? 0, priority);
	const draw = shieldDraw(loadout.shield.draw ?? 0, priority);
	const time = shieldTimeToFull(capacity, regen);
	return { capacity, regenRate: regen, draw, timeToFull: time };
}

function formatNav(loadout: Loadout, constants: Constants): ShipReport['nav'] {
	const skill = loadout.nav.mult_a ?? 0;
	const efficiency = loadout.nav.mult_b ?? 0;
	const depths = [0, 1, 2, 3, 4, 5];
	return {
		skill,
		efficiency,
		discoveryByDepth: depths.map((depth) => ({
			depth,
			probability: discoveryProbability(skill, efficiency, depth, constants.hopDecayFactor),
		})),
	};
}

function formatSignature(loadout: Loadout): ShipReport['signature'] {
	return {
		hullSignature: loadout.hull.hullSignature,
		weaponDrawMultiplier: loadout.hull.weaponDrawMultiplier ?? 1.0,
		stealthDrawMultiplier: loadout.hull.stealthDrawMultiplier ?? 1.0,
	};
}

function formatMechanics(
	loadout: Loadout,
	shield: ShipReport['shield'],
	jump: ShipReport['jump'],
	scan: ShipReport['scan'],
	power: ShipReport['power'],
): ShipReport['mechanics'] {
	const driveMultD = loadout.drive.mult_d;
	const sensorMultD = loadout.sensor.mult_d;
	const shieldMultD = loadout.shield.mult_d;

	const transitShieldRegen = driveMultD !== null
		? {
			regenRateInTransit: transitShieldRegenRate(shield.regenRate, driveMultD),
			sampleJumps: jump.sampleJumps.map((j) => ({
				distance: j.distance,
				shieldRecovered: transitShieldRecovered(shield.regenRate, j.duration, driveMultD),
			})),
		}
		: null;

	const coreResonanceScanning = sensorMultD !== null
		? {
			sampleScans: scan.sampleScans.map((s) => {
				const { capacitorCost, coreDamage } = coreResonanceCost(s.cost, sensorMultD);
				return {
					distance: s.distance,
					capacitorCost,
					coreDamage,
					scansBeforeCoreDeath: coreDamage > 0 ? Math.floor(power.coreLife / coreDamage) : Infinity,
				};
			}),
		}
		: null;

	const sensorShieldCoupling = shieldMultD !== null
		? { passiveAffinityMultiplier: sensorShieldCouplingMultiplier(shieldMultD) }
		: null;

	return { transitShieldRegen, coreResonanceScanning, sensorShieldCoupling };
}

export function computeShipReport(
	loadout: Loadout,
	tuning: ActionTuning,
	constants: Constants,
): ShipReport {
	const power = formatPower(loadout);
	const scan = formatScan(loadout, power.coreOutput, tuning.effort, constants);
	const jump = formatJump(loadout, power.coreOutput, power.perfRatio, tuning.throttle, constants);
	const shield = formatShield(loadout, tuning.priority);
	return {
		footprint: formatFootprint(loadout),
		power,
		scan,
		jump,
		shield,
		nav: formatNav(loadout, constants),
		signature: formatSignature(loadout),
		mechanics: formatMechanics(loadout, shield, jump, scan, power),
	};
}
