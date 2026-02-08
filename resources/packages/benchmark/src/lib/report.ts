import type { Stats } from './stats';
import { gitSha, gitBranch } from './git';

export interface BenchResult {
	label: string;
	total: Stats;
	ttfb: Stats;
	size: number;
	iterations: number;
}

export interface BenchGroup {
	name: string;
	results: BenchResult[];
}

export interface BenchReport {
	timestamp: string;
	git: { sha: string; branch: string };
	groups: BenchGroup[];
}

const REPORT_DIR = new URL('../../results', import.meta.url).pathname;

export async function buildReport(groups: BenchGroup[]): Promise<BenchReport> {
	const [sha, branch] = await Promise.all([gitSha(), gitBranch()]);
	const timestamp = new Date().toISOString();
	return { timestamp, git: { sha, branch }, groups };
}

export async function saveReport(report: BenchReport): Promise<string> {
	const slug = report.timestamp.replace(/[:.]/g, '-').replace('Z', '');

	await Bun.spawn(['mkdir', '-p', REPORT_DIR]).exited;

	const filepath = `${REPORT_DIR}/${slug}_${report.git.sha}.json`;
	await Bun.write(filepath, JSON.stringify(report, null, 2));

	return filepath;
}

export async function writeReport(
	report: BenchReport,
	filepath: string
): Promise<void> {
	await Bun.write(filepath, JSON.stringify(report, null, 2));
}

export async function loadReport(filepath: string): Promise<BenchReport> {
	const file = Bun.file(filepath);
	const text = await file.text();
	return JSON.parse(text) as BenchReport;
}

export async function loadLatestReport(
	beforeTimestamp?: string
): Promise<{ report: BenchReport; filepath: string } | null> {
	const { readdir } = await import('node:fs/promises');

	let files: string[];
	try {
		files = await readdir(REPORT_DIR);
	} catch {
		return null;
	}

	const jsonFiles = files
		.filter((f) => f.endsWith('.json'))
		.sort()
		.reverse();

	for (const file of jsonFiles) {
		const filepath = `${REPORT_DIR}/${file}`;
		const report = await loadReport(filepath);
		if (!beforeTimestamp || report.timestamp < beforeTimestamp) {
			return { report, filepath };
		}
	}

	return null;
}

export function findResult(
	report: BenchReport,
	groupName: string,
	label: string
): BenchResult | undefined {
	const group = report.groups.find((g) => g.name === groupName);
	return group?.results.find((r) => r.label === label);
}
