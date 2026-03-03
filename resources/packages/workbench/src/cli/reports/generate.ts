import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { runAnalyse } from '../analyse';
import { runDspProgress } from '../dsp-progress';
import { runBalance } from '../balance';
import { runDetection } from '../detection';
import { diffBaseline } from '../baseline-diff';
import { BASELINE_COMMANDS } from '../baseline-types';
import type { BaselineCommand, DiffResult } from '../baseline-types';
import type { ReportContext, ReportFile } from './types';
import { renderSummary } from './summary';
import { renderDspHealth } from './dsp-health';
import { renderHullBalance } from './hull-balance';
import { renderDetection } from './detection';
import { renderRegression } from './regression';

const BASELINES_DIR = resolve(import.meta.dirname, '../../../data/baselines');
const REPORTS_DIR = resolve(import.meta.dirname, '../../../reports');

function loadBaseline(command: BaselineCommand): unknown | null {
	const path = resolve(BASELINES_DIR, `${command}.json`);
	if (!existsSync(path)) { return null; }
	return JSON.parse(readFileSync(path, 'utf-8'));
}

function loadDiffs(ctx: {
	analyse: unknown;
	dspProgress: unknown;
	balance: unknown;
	detection: unknown;
}): DiffResult[] | null {
	const results: DiffResult[] = [];
	let hasAny = false;

	const commandData: Record<BaselineCommand, unknown> = {
		'analyse': ctx.analyse,
		'dsp-progress': ctx.dspProgress,
		'balance': ctx.balance,
		'detection': ctx.detection,
	};

	for (const command of BASELINE_COMMANDS) {
		const baseline = loadBaseline(command);
		if (baseline === null) { continue; }
		hasAny = true;
		results.push(diffBaseline(command, baseline, commandData[command]));
	}

	return hasAny ? results : null;
}

export function generateReports(): void {
	const log = console.error.bind(console); // eslint-disable-line no-console

	log('Running analysis...');

	const analyse = runAnalyse();
	const dspProgress = runDspProgress();
	const balance = runBalance({ flags: {}, positional: [] });
	const detection = runDetection();

	log('Diffing against baselines...');
	const diffs = loadDiffs({ analyse, dspProgress, balance, detection });

	const ctx: ReportContext = {
		generated: new Date().toISOString(),
		analyse,
		dspProgress,
		balance,
		detection,
		diffs,
	};

	const files: ReportFile[] = [
		renderSummary(ctx),
		renderDspHealth(ctx),
		renderHullBalance(ctx),
		renderDetection(ctx),
	];

	if (diffs) {
		files.push(renderRegression(ctx));
	}

	// Write files
	mkdirSync(REPORTS_DIR, { recursive: true });
	for (const file of files) {
		const path = resolve(REPORTS_DIR, file.filename);
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, file.content);
		log(`  wrote ${file.filename}`);
	}

	// Summary
	log('');
	log(`Generated ${files.length} reports in reports/`);

	if (!diffs) {
		log('  (no baselines found — regression.md skipped. Run: bun run wb baseline save --all)');
	}

	// Surface critical findings
	const { summary } = dspProgress;
	if (summary.fail > 0) {
		log(`  !! ${summary.fail} FAIL verdict(s) in DSP health`);
	}
	if (summary.warn > 0) {
		log(`  !  ${summary.warn} WARN verdict(s) in DSP health`);
	}
	if (balance.outliers.length > 0) {
		log(`  !  ${balance.outliers.length} balance outlier(s)`);
	}
	if (diffs) {
		const totalRegressions = diffs.reduce((n, d) => n + d.summary.regressions, 0);
		if (totalRegressions > 0) {
			log(`  !! ${totalRegressions} regression(s) since baseline`);
		}
	}
}
