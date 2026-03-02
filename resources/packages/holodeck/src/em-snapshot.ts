import { stellarNoise, noiseFloor } from '@helm/formulas';
import type { EmissionSource } from '@helm/formulas';
import type { EmissionRecord } from './actions/types';
import { computeEquipmentEmissions, emissionPowerAtTime } from './emissions';
import type { Ship } from './ship';

export interface EMSnapshot {
	nodeId: number;
	computedAt: number;
	stellarBaseline: number;
	noiseFloor: number;
	sources: EMSnapshotSource[];
	ecmNoise: number;
}

export interface EMSnapshotSource extends EmissionSource {
	shipId: string;
	emissionType: string;
}

/**
 * Build an EM snapshot for a node: aggregate all emissions into a noise floor
 * and source list suitable for passiveReport().
 */
export function computeEMSnapshot(
	nodeId: number,
	spectralClass: string,
	actionEmissions: EmissionRecord[],
	shipsAtNode: Array<{ shipId: string; ship: Ship }>,
	atTime: number,
): EMSnapshot {
	// 1. Stellar baseline
	const baseline = stellarNoise(spectralClass);

	// 2. Gather all emissions: action-tracked + equipment-derived
	const allEmissions: EmissionRecord[] = [...actionEmissions];

	for (const { shipId, ship } of shipsAtNode) {
		const equipmentEmissions = computeEquipmentEmissions(ship, shipId, atTime);
		allEmissions.push(...equipmentEmissions);
	}

	// 3. Separate ECM from sources
	let ecmNoise = 0;
	const sources: EMSnapshotSource[] = [];
	const allPowers: number[] = [];

	for (const emission of allEmissions) {
		const power = emissionPowerAtTime(emission, atTime);
		if (power <= 0) {
			continue;
		}
		allPowers.push(power);

		if (emission.emissionType === 'ecm') {
			ecmNoise += power;
		} else {
			sources.push({
				power,
				spectralType: emission.spectralType,
				label: emission.label ?? `${emission.shipId}:${emission.emissionType}`,
				shipId: emission.shipId,
				emissionType: emission.emissionType,
			});
		}
	}

	// 4. Compute noise floor
	const floor = noiseFloor(baseline, allPowers, 0, ecmNoise, 0);

	return {
		nodeId,
		computedAt: atTime,
		stellarBaseline: baseline,
		noiseFloor: floor,
		sources,
		ecmNoise,
	};
}
