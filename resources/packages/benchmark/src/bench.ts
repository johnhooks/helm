import { ensureAppPassword, resolveApiBase } from './lib/auth';
import { apiGet } from './lib/client';
import { fail, header as outputHeader, info } from './lib/output';
import { computeStats, formatMs, formatBytes } from './lib/stats';
import type { BenchResult } from './lib/report';
import { checkReadiness } from './checks';

export { outputHeader as header };

export interface SetupResult {
	auth: string;
	apiBase: string;
}

export interface BenchOptions {
	label: string;
	url: string;
	iterations: number;
	auth: string;
	quiet?: boolean;
	/**
	 * Validate the first response body. Return an error string to abort, or null if OK.
	 */
	validate?: (body: unknown) => string | null;
}

export async function setup(): Promise<SetupResult> {
	info('Setting up benchmark environment...');
	const apiBase = await resolveApiBase();
	const auth = await ensureAppPassword(apiBase);
	await checkReadiness();
	console.error(); // eslint-disable-line no-console
	return { auth, apiBase };
}

export async function bench(opts: BenchOptions): Promise<BenchResult | null> {
	const { label, url, iterations, auth, quiet, validate } = opts;

	if (!quiet) {
		process.stderr.write(`  ${label}...`);
	}

	const totals: number[] = [];
	const ttfbs: number[] = [];
	let lastSize = 0;
	let lastStatus = 0;

	for (let i = 0; i < iterations; i++) {
		const res = await apiGet(url, auth);
		totals.push(res.total);
		ttfbs.push(res.ttfb);
		lastSize = res.size;
		lastStatus = res.status;

		if (i === 0 && validate) {
			const error = validate(res.body);
			if (error) {
				if (!quiet) {
					process.stderr.write('\n');
				}
				fail(`${label}: ${error}`);
				return null;
			}
		}
	}

	if (lastStatus !== 200) {
		if (!quiet) {
			process.stderr.write('\n');
		}
		fail(`${label}: HTTP ${lastStatus}`);
		return null;
	}

	const total = computeStats(totals);
	const ttfb = computeStats(ttfbs);

	if (!quiet) {
		process.stderr.write(' done\n');
	}

	return { label, total, ttfb, size: lastSize, iterations };
}

export function formatResult(r: BenchResult): string {
	return (
		`  ${r.label}  ` +
		`min=${formatMs(r.total.min)}  ` +
		`avg=${formatMs(r.total.avg)}  ` +
		`max=${formatMs(r.total.max)}  ` +
		`p95=${formatMs(r.total.p95)}  ` +
		`ttfb=${formatMs(r.ttfb.avg)}  ` +
		`size=${formatBytes(r.size)}`
	);
}

export function formatComparison(
	r: BenchResult,
	baseline: BenchResult
): string {
	const delta =
		((r.total.avg - baseline.total.avg) / baseline.total.avg) * 100;
	const sign = delta > 0 ? '+' : '';
	const isTTY = process.stderr.isTTY ?? false;
	const GREEN = isTTY ? '\x1b[32m' : '';
	const RED = isTTY ? '\x1b[31m' : '';
	const RESET = isTTY ? '\x1b[0m' : '';
	let color = '';
	let indicator = '';
	if (delta <= -1) {
		color = GREEN;
		indicator = ' faster';
	} else if (delta >= 1) {
		color = RED;
		indicator = ' slower';
	}

	return (
		`  ${r.label}  ` +
		`avg=${formatMs(r.total.avg)}  ` +
		`p95=${formatMs(r.total.p95)}  ` +
		`size=${formatBytes(r.size)}  ` +
		`${color}${sign}${delta.toFixed(1)}%${indicator}${RESET}`
	);
}
