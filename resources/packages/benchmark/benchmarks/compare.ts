import { loadReport, loadLatestReport, findResult } from '../src/lib/report';
import type { BenchReport } from '../src/lib/report';
import { header, formatComparison, formatResult } from '../src/bench';
import { info, ok, die } from '../src/lib/output';

// --- Parse args ---

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));

let baseline: { report: BenchReport; filepath: string };
let current: { report: BenchReport; filepath: string };

if (args.length === 2) {
	// Compare two specific files
	baseline = {
		report: await loadReport(args[0]),
		filepath: args[0],
	};
	current = {
		report: await loadReport(args[1]),
		filepath: args[1],
	};
} else if (args.length === 1) {
	// Compare specific file against latest
	const latest = await loadLatestReport();
	if (!latest) {
		die('No saved reports found.');
	}
	baseline = {
		report: await loadReport(args[0]),
		filepath: args[0],
	};
	current = latest;
} else {
	// Compare last two reports
	const latest = await loadLatestReport();
	if (!latest) {
		die('No saved reports found.');
	}
	const prev = await loadLatestReport(latest.report.timestamp);
	if (!prev) {
		die('Only one saved report found. Need at least two to compare.');
	}
	baseline = prev;
	current = latest;
}

// --- Print comparison ---

info(`Baseline: ${baseline.filepath}`);
info(
	`  ${baseline.report.git.branch}@${baseline.report.git.sha}  ${baseline.report.timestamp}`
);
info(`Current:  ${current.filepath}`);
info(
	`  ${current.report.git.branch}@${current.report.git.sha}  ${current.report.timestamp}`
);

for (const group of current.report.groups) {
	header(group.name);
	for (const r of group.results) {
		const base = findResult(baseline.report, group.name, r.label);
		if (base) {
			console.error(formatComparison(r, base)); // eslint-disable-line no-console
		} else {
			console.error(formatResult(r) + '  (new)'); // eslint-disable-line no-console
		}
	}
}

// Check for removed benchmarks
for (const group of baseline.report.groups) {
	const currentGroup = current.report.groups.find(
		(g) => g.name === group.name
	);
	for (const r of group.results) {
		const inCurrent = currentGroup?.results.find(
			(cr) => cr.label === r.label
		);
		if (!inCurrent) {
			ok(`  ${r.label}  (removed)`);
		}
	}
}
