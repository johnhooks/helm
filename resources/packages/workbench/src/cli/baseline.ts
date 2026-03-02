import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { BASELINE_COMMANDS, type BaselineCommand, type DiffResult } from './baseline-types';
import { diffBaseline } from './baseline-diff';
import { runAnalyse } from './analyse';
import { runDspProgress } from './dsp-progress';
import { runBalance } from './balance';
import { runDetection } from './detection';

const BASELINES_DIR = resolve(import.meta.dirname, '../../data/baselines');

function baselinePath(command: BaselineCommand): string {
	return resolve(BASELINES_DIR, `${command}.json`);
}

function isBaselineCommand(value: string): value is BaselineCommand {
	return (BASELINE_COMMANDS as readonly string[]).includes(value);
}

function runCommand(command: BaselineCommand): unknown {
	switch (command) {
		case 'analyse': return runAnalyse();
		case 'dsp-progress': return runDspProgress();
		case 'balance': return runBalance({ flags: {}, positional: [] });
		case 'detection': return runDetection();
	}
}

function saveBaseline(command: BaselineCommand): void {
	const data = runCommand(command);
	const json = JSON.stringify(data, null, 2);
	mkdirSync(dirname(baselinePath(command)), { recursive: true });
	writeFileSync(baselinePath(command), json + '\n');
	console.error(`Saved ${command} baseline → ${baselinePath(command)}`); // eslint-disable-line no-console
}

function showBaseline(command: BaselineCommand): void {
	const path = baselinePath(command);
	if (!existsSync(path)) {
		console.error(`No baseline found for ${command}. Run: bun run wb baseline save ${command}`); // eslint-disable-line no-console
		process.exit(1);
	}
	const content = readFileSync(path, 'utf-8');
	console.log(content.trimEnd()); // eslint-disable-line no-console
}

function loadBaseline(command: BaselineCommand): unknown | null {
	const path = baselinePath(command);
	if (!existsSync(path)) { return null; }
	return JSON.parse(readFileSync(path, 'utf-8'));
}

function printDiffResult(result: DiffResult): void {
	const { command, summary, entries } = result;
	const log = console.error.bind(console); // eslint-disable-line no-console

	if (entries.length === 0) {
		log(`${command}: no changes`);
		return;
	}

	log(`\n${command}: ${entries.length} changes (${summary.regressions} regressions, ${summary.improvements} improvements)`);

	for (const entry of entries) {
		let prefix = '  ';
		if (entry.regression) { prefix = '  !! '; }
		else if (entry.improvement) { prefix = '  ++ '; }

		const location = entry.field ? `${entry.path} > ${entry.field}` : entry.path;

		if (entry.type === 'added') {
			log(`${prefix}ADDED: ${location} = ${JSON.stringify(entry.after)}`);
		} else if (entry.type === 'removed') {
			log(`${prefix}REMOVED: ${location} (was ${JSON.stringify(entry.before)})`);
		} else if (entry.delta !== undefined) {
			const sign = entry.delta > 0 ? '+' : '';
			log(`${prefix}${location}: ${entry.before} → ${entry.after} (${sign}${entry.delta})`);
		} else {
			log(`${prefix}${location}: ${JSON.stringify(entry.before)} → ${JSON.stringify(entry.after)}`);
		}
	}
}

function diffCommand(command: BaselineCommand): DiffResult {
	const before = loadBaseline(command);
	if (before === null) {
		console.error(`No baseline found for ${command}. Run: bun run wb baseline save ${command}`); // eslint-disable-line no-console
		process.exit(1);
	}
	const after = runCommand(command);
	return diffBaseline(command, before, after);
}

export function baseline(args: string[], flags: Record<string, string> = {}): void {
	const subcommand = args[0];
	const target = args[1];

	if (!subcommand || !['save', 'show', 'diff'].includes(subcommand)) {
		console.error('Usage: bun run wb baseline <save|show|diff> <command|--all>'); // eslint-disable-line no-console
		console.error(''); // eslint-disable-line no-console
		console.error('Commands: analyse, dsp-progress, balance, detection'); // eslint-disable-line no-console
		console.error(''); // eslint-disable-line no-console
		console.error('  baseline save <command>     Save current output as baseline'); // eslint-disable-line no-console
		console.error('  baseline save --all         Save all baselines'); // eslint-disable-line no-console
		console.error('  baseline show <command>     Print saved baseline to stdout'); // eslint-disable-line no-console
		console.error('  baseline diff <command>     Diff current vs saved baseline'); // eslint-disable-line no-console
		console.error('  baseline diff --all         Diff all baselines'); // eslint-disable-line no-console
		process.exit(1);
	}

	const all = flags.all === 'true';

	if (subcommand === 'save') {
		const commands = all ? [...BASELINE_COMMANDS] : [target];
		for (const cmd of commands) {
			if (!cmd || !isBaselineCommand(cmd)) {
				console.error(`Unknown command: ${cmd}. Valid: ${BASELINE_COMMANDS.join(', ')}`); // eslint-disable-line no-console
				process.exit(1);
			}
			saveBaseline(cmd);
		}
		return;
	}

	if (subcommand === 'show') {
		if (!target || !isBaselineCommand(target)) {
			console.error(`Usage: bun run wb baseline show <command>`); // eslint-disable-line no-console
			console.error(`Valid commands: ${BASELINE_COMMANDS.join(', ')}`); // eslint-disable-line no-console
			process.exit(1);
		}
		showBaseline(target);
		return;
	}

	if (subcommand === 'diff') {
		const commands = all ? [...BASELINE_COMMANDS] : [target];
		let hasRegressions = false;

		for (const cmd of commands) {
			if (!cmd || !isBaselineCommand(cmd)) {
				console.error(`Unknown command: ${cmd}. Valid: ${BASELINE_COMMANDS.join(', ')}`); // eslint-disable-line no-console
				process.exit(1);
			}
			const result = diffCommand(cmd);
			printDiffResult(result);
			if (result.summary.regressions > 0) { hasRegressions = true; }
		}

		if (hasRegressions) { process.exit(1); }
	}
}
