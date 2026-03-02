import { emissionPower, envelopeAt, DEFAULT_EMISSION_PROFILES } from '@helm/formulas';
import type { Ship } from './ship';
import type { EmissionRecord } from './actions/types';

/**
 * Get instantaneous emission power for a record at a given time.
 * If the record has an envelope, use envelopeAt() to compute the
 * time-varying power. Otherwise return flat basePower.
 */
export function emissionPowerAtTime(record: EmissionRecord, atTime: number): number {
	if (!record.envelope) {
		return record.basePower;
	}
	const elapsed = atTime - record.startedAt;
	if (elapsed < 0) {
		return 0;
	}
	const state = envelopeAt(elapsed, record.envelope);
	return state.phase === 'idle' ? 0 : record.basePower * state.power;
}

/**
 * Compute synthetic emission records for equipment that is always-on.
 * These are not tracked as action emissions — they're derived from ship state.
 */
export function computeEquipmentEmissions(
	ship: Ship,
	shipId: string,
	_atTime: number,
): EmissionRecord[] {
	const state = ship.resolve();
	const emissions: EmissionRecord[] = [];
	const nodeId = state.nodeId;

	if (nodeId === null) {
		return emissions;
	}

	// ECM active → continuous ecm emission
	if (state.activeEquipment.includes('ecm_mk1')) {
		emissions.push({
			id: -1,
			shipId,
			actionId: -1,
			nodeId,
			emissionType: 'ecm',
			spectralType: DEFAULT_EMISSION_PROFILES.ecm.spectralType,
			basePower: emissionPower('ecm'),
			startedAt: 0,
			endedAt: null,
		});
	}

	// Shields not full → shield_regen emission
	if (state.shield < state.shieldMax) {
		emissions.push({
			id: -1,
			shipId,
			actionId: -1,
			nodeId,
			emissionType: 'shield_regen',
			spectralType: DEFAULT_EMISSION_PROFILES.shield_regen.spectralType,
			basePower: emissionPower('shield_regen'),
			startedAt: 0,
			endedAt: null,
		});
	}

	return emissions;
}
