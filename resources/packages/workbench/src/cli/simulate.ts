/**
 * Simulate command — run a scenario JSON file through the simulation engine.
 *
 * bun run wb simulate data/scenarios/jump-chain.json
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { simulate } from '../sim/engine';
import type { Scenario } from '../sim/types';
import type { ParsedFlags } from './parse';

export function simulateCommand({ positional }: ParsedFlags): void {
	const scenarioPath = positional[1];
	if (!scenarioPath) {
		console.error('Usage: bun run wb simulate <scenario.json>'); // eslint-disable-line no-console
		process.exit(1);
	}

	const fullPath = resolve(process.cwd(), scenarioPath);
	const raw = readFileSync(fullPath, 'utf-8');
	const scenario: Scenario = JSON.parse(raw);

	const snapshots = simulate(scenario);

	const output = {
		scenario: scenario.name,
		description: scenario.description,
		shipCount: Object.keys(scenario.ships).length,
		actionCount: scenario.actions.length,
		snapshotCount: snapshots.length,
		timeline: snapshots,
	};

	console.log(JSON.stringify(output, null, 2)); // eslint-disable-line no-console
}
