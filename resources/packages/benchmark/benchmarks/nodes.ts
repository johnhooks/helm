import { LinkRel } from '@helm/types';
import { setup, bench, header, formatResult, formatComparison } from '../src';
import {
	buildReport,
	saveReport,
	writeReport,
	loadLatestReport,
	findResult,
} from '../src/lib/report';
import type { BenchResult, BenchGroup } from '../src/lib/report';
import { ok, info } from '../src/lib/output';

// --- Parse args ---

const isJson = process.argv.includes('--format=json');
const outputFlag = process.argv.find((a) => a.startsWith('--output='));
const outputPath = outputFlag?.split('=')[1];
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const iterations = parseInt(positional[0] ?? '20', 10);
const quiet = isJson;

// --- Validators ---

function validateNodes(body: unknown): string | null {
	if (!Array.isArray(body)) {
		return `expected array, got ${typeof body}`;
	}
	if (body.length === 0) {
		return 'empty response';
	}
	const node = body[0];
	for (const key of ['id', 'type', 'x', 'y', 'z']) {
		if (!(key in node)) {
			return `missing field "${key}" on node`;
		}
	}
	return null;
}

function validateEmbedded(body: unknown): string | null {
	const nodeErr = validateNodes(body);
	if (nodeErr) {
		return nodeErr;
	}

	const node = (body as Record<string, unknown>[])[0];
	const embedded = node._embedded as Record<string, unknown> | undefined;
	if (!embedded) {
		return 'missing _embedded on node';
	}
	const stars = embedded[ LinkRel.Stars ];
	if (!Array.isArray(stars)) {
		return `expected _embedded["${ LinkRel.Stars }"] array, got ${typeof stars}`;
	}
	if (stars.length === 0) {
		return `_embedded["${ LinkRel.Stars }"] is empty`;
	}
	const star = stars[0] as Record<string, unknown>;
	for (const key of ['id', 'post_type', 'title', 'catalog_id', 'spectral_class', 'x', 'y', 'z']) {
		if (!(key in star)) {
			return `missing field "${key}" on star`;
		}
	}
	return null;
}

// --- Setup ---

const { auth, apiBase } = await setup();

function url(
	path: string,
	params: Record<string, string | number> = {}
): string {
	const sep = apiBase.includes('?') ? '&' : '?';
	const qs = Object.entries(params)
		.map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
		.join('&');
	return `${apiBase}${path}${qs ? sep + qs : ''}`;
}

// --- Run benchmarks ---

const groups: BenchGroup[] = [];

// Group 1: baseline
const baselineName = 'GET /helm/v1/nodes';
if (!quiet) {
	header(`${baselineName}  (${iterations} iterations)`);
}
const baselineResults: BenchResult[] = [];
for (const perPage of [10, 50, 100, 250, 500]) {
	const r = await bench({
		label: `per_page=${perPage}`,
		url: url('/nodes', { per_page: perPage }),
		iterations,
		auth,
		quiet,
		validate: validateNodes,
	});
	if (r) {
		baselineResults.push(r);
	}
}
groups.push({ name: baselineName, results: baselineResults });

// Group 2: embedded
const embedName = 'GET /helm/v1/nodes?_embed (stars embedded)';
if (!quiet) {
	header(embedName);
}
const embedResults: BenchResult[] = [];
for (const perPage of [10, 50, 100, 250, 500]) {
	const r = await bench({
		label: `_embed pp=${perPage}`,
		url: url('/nodes', { _embed: LinkRel.Stars, per_page: perPage }),
		iterations,
		auth,
		quiet,
		validate: validateEmbedded,
	});
	if (r) {
		embedResults.push(r);
	}
}
groups.push({ name: embedName, results: embedResults });

// --- Build report ---

const report = await buildReport(groups);

// --- Output ---

if (isJson) {
	if (outputPath) {
		await writeReport(report, outputPath);
		ok(`Written to: ${outputPath}`);
	} else {
		console.log(JSON.stringify(report, null, 2)); // eslint-disable-line no-console
	}
} else {
	// Print results (with comparison if previous report exists)
	const previous = await loadLatestReport();

	if (previous) {
		info(`\nCompared against: ${previous.filepath}`);
	}

	console.error(); // eslint-disable-line no-console
	for (const group of groups) {
		header(group.name);
		for (const r of group.results) {
			const base = previous
				? findResult(previous.report, group.name, r.label)
				: undefined;
			if (base) {
				console.error(formatComparison(r, base)); // eslint-disable-line no-console
			} else {
				console.error(formatResult(r)); // eslint-disable-line no-console
			}
		}
	}

	// Always save in human mode
	const filepath = await saveReport(report);
	ok(`\nSaved to: ${filepath}`);
}
