import type { BaselineCommand, DiffEntry, DiffResult } from './baseline-types';

// Verdict ranking for dsp-progress regression detection.
// INFO is excluded from regression/improvement classification.
const VERDICT_RANK: Record<string, number> = {
	FAIL: 1,
	WARN: 2,
	PASS: 3,
	INFO: 0,
};

function verdictRegression(
	before: string,
	after: string
): { regression: boolean; improvement: boolean } {
	const bRank = VERDICT_RANK[before] ?? 0;
	const aRank = VERDICT_RANK[after] ?? 0;
	// INFO transitions are always neutral
	if (bRank === 0 || aRank === 0) {
		return { regression: false, improvement: false };
	}
	return {
		regression: aRank < bRank,
		improvement: aRank > bRank,
	};
}

function numericDelta(before: unknown, after: unknown): number | undefined {
	if (typeof before === 'number' && typeof after === 'number') {
		const delta = after - before;
		return Math.round(delta * 1e6) / 1e6; // avoid floating point noise
	}
	return undefined;
}

// ── dsp-progress differ ──────────────────────────────────────

interface DspCheck {
	goal: string;
	verdict: string;
	values?: Record<string, unknown>;
}

interface DspSection {
	title: string;
	checks: DspCheck[];
}

interface DspOutput {
	generated: string;
	sections: DspSection[];
}

function diffDspProgress(before: DspOutput, after: DspOutput): DiffEntry[] {
	const entries: DiffEntry[] = [];

	const afterSections = new Map(after.sections.map((s) => [s.title, s]));
	const beforeSections = new Map(before.sections.map((s) => [s.title, s]));

	// Check for removed sections
	for (const [title] of beforeSections) {
		if (!afterSections.has(title)) {
			entries.push({ path: title, type: 'removed', before: title });
		}
	}

	// Check for added sections
	for (const [title] of afterSections) {
		if (!beforeSections.has(title)) {
			entries.push({ path: title, type: 'added', after: title });
		}
	}

	// Diff matching sections
	for (const [title, beforeSection] of beforeSections) {
		const afterSection = afterSections.get(title);
		if (!afterSection) {
			continue;
		}

		const afterChecks = new Map(
			afterSection.checks.map((c) => [c.goal, c])
		);
		const beforeChecks = new Map(
			beforeSection.checks.map((c) => [c.goal, c])
		);

		for (const [goal] of beforeChecks) {
			if (!afterChecks.has(goal)) {
				entries.push({
					path: `${title} > ${goal}`,
					type: 'removed',
					before: goal,
				});
			}
		}

		for (const [goal] of afterChecks) {
			if (!beforeChecks.has(goal)) {
				entries.push({
					path: `${title} > ${goal}`,
					type: 'added',
					after: goal,
				});
			}
		}

		for (const [goal, beforeCheck] of beforeChecks) {
			const afterCheck = afterChecks.get(goal);
			if (!afterCheck) {
				continue;
			}
			const path = `${title} > ${goal}`;

			// Verdict change
			if (beforeCheck.verdict !== afterCheck.verdict) {
				const { regression, improvement } = verdictRegression(
					beforeCheck.verdict,
					afterCheck.verdict
				);
				entries.push({
					path,
					type: 'changed',
					field: 'verdict',
					before: beforeCheck.verdict,
					after: afterCheck.verdict,
					regression,
					improvement,
				});
			}

			// Values diff
			if (beforeCheck.values && afterCheck.values) {
				diffValues(
					path,
					beforeCheck.values,
					afterCheck.values,
					entries
				);
			}
		}
	}

	return entries;
}

function diffValues(
	basePath: string,
	before: Record<string, unknown>,
	after: Record<string, unknown>,
	entries: DiffEntry[]
): void {
	const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
	for (const key of allKeys) {
		const bVal = before[key];
		const aVal = after[key];
		if (bVal === undefined) {
			entries.push({
				path: basePath,
				type: 'added',
				field: key,
				after: aVal,
			});
			continue;
		}
		if (aVal === undefined) {
			entries.push({
				path: basePath,
				type: 'removed',
				field: key,
				before: bVal,
			});
			continue;
		}
		if (
			typeof bVal === 'object' &&
			typeof aVal === 'object' &&
			bVal !== null &&
			aVal !== null
		) {
			diffValues(
				`${basePath} > ${key}`,
				bVal as Record<string, unknown>,
				aVal as Record<string, unknown>,
				entries
			);
			continue;
		}
		if (bVal !== aVal) {
			const delta = numericDelta(bVal, aVal);
			entries.push({
				path: basePath,
				type: 'changed',
				field: key,
				before: bVal,
				after: aVal,
				delta,
			});
		}
	}
}

// ── analyse differ ───────────────────────────────────────────

interface AnalyseScenario {
	name: string;
	output: Record<string, unknown>;
}

interface AnalyseCategory {
	category: string;
	scenarios: AnalyseScenario[];
}

interface AnalyseOutput {
	generated: string;
	categories: AnalyseCategory[];
}

function diffAnalyse(before: AnalyseOutput, after: AnalyseOutput): DiffEntry[] {
	const entries: DiffEntry[] = [];

	const afterCats = new Map(after.categories.map((c) => [c.category, c]));
	const beforeCats = new Map(before.categories.map((c) => [c.category, c]));

	for (const [cat] of beforeCats) {
		if (!afterCats.has(cat)) {
			entries.push({ path: cat, type: 'removed', before: cat });
		}
	}
	for (const [cat] of afterCats) {
		if (!beforeCats.has(cat)) {
			entries.push({ path: cat, type: 'added', after: cat });
		}
	}

	for (const [cat, beforeCat] of beforeCats) {
		const afterCat = afterCats.get(cat);
		if (!afterCat) {
			continue;
		}

		const afterScenarios = new Map(
			afterCat.scenarios.map((s) => [s.name, s])
		);
		const beforeScenarios = new Map(
			beforeCat.scenarios.map((s) => [s.name, s])
		);

		for (const [name] of beforeScenarios) {
			if (!afterScenarios.has(name)) {
				entries.push({
					path: `${cat} > ${name}`,
					type: 'removed',
					before: name,
				});
			}
		}
		for (const [name] of afterScenarios) {
			if (!beforeScenarios.has(name)) {
				entries.push({
					path: `${cat} > ${name}`,
					type: 'added',
					after: name,
				});
			}
		}

		for (const [name, beforeScenario] of beforeScenarios) {
			const afterScenario = afterScenarios.get(name);
			if (!afterScenario) {
				continue;
			}
			diffNumericLeaves(
				`${cat} > ${name}`,
				beforeScenario.output,
				afterScenario.output,
				entries
			);
		}
	}

	return entries;
}

function diffNumericLeaves(
	basePath: string,
	before: unknown,
	after: unknown,
	entries: DiffEntry[]
): void {
	if (typeof before === 'number' && typeof after === 'number') {
		if (before !== after) {
			const delta = numericDelta(before, after);
			entries.push({
				path: basePath,
				type: 'changed',
				before,
				after,
				delta,
			});
		}
		return;
	}

	if (
		typeof before === 'object' &&
		typeof after === 'object' &&
		before !== null &&
		after !== null
	) {
		if (Array.isArray(before) && Array.isArray(after)) {
			const len = Math.max(before.length, after.length);
			for (let i = 0; i < len; i++) {
				if (i >= before.length) {
					entries.push({
						path: `${basePath}[${i}]`,
						type: 'added',
						after: after[i],
					});
				} else if (i >= after.length) {
					entries.push({
						path: `${basePath}[${i}]`,
						type: 'removed',
						before: before[i],
					});
				} else {
					diffNumericLeaves(
						`${basePath}[${i}]`,
						before[i],
						after[i],
						entries
					);
				}
			}
			return;
		}

		const bObj = before as Record<string, unknown>;
		const aObj = after as Record<string, unknown>;
		const allKeys = new Set([...Object.keys(bObj), ...Object.keys(aObj)]);
		for (const key of allKeys) {
			if (!(key in bObj)) {
				entries.push({
					path: `${basePath}.${key}`,
					type: 'added',
					after: aObj[key],
				});
			} else if (!(key in aObj)) {
				entries.push({
					path: `${basePath}.${key}`,
					type: 'removed',
					before: bObj[key],
				});
			} else {
				diffNumericLeaves(
					`${basePath}.${key}`,
					bObj[key],
					aObj[key],
					entries
				);
			}
		}
		return;
	}

	// Non-numeric leaf: string, boolean, etc.
	if (before !== after) {
		entries.push({ path: basePath, type: 'changed', before, after });
	}
}

// ── balance differ ───────────────────────────────────────────

interface BalanceRow {
	hull: string;
	core?: string;
	drive?: string;
	[key: string]: unknown;
}

interface BalanceOutput {
	generated: string;
	rows: BalanceRow[];
	outliers: string[];
}

function balanceRowKey(row: BalanceRow): string {
	const parts = [row.hull];
	if (row.core) {
		parts.push(row.core);
	}
	if (row.drive) {
		parts.push(row.drive);
	}
	return parts.join('+');
}

function diffBalance(before: BalanceOutput, after: BalanceOutput): DiffEntry[] {
	const entries: DiffEntry[] = [];

	const afterRows = new Map(after.rows.map((r) => [balanceRowKey(r), r]));
	const beforeRows = new Map(before.rows.map((r) => [balanceRowKey(r), r]));

	for (const [key] of beforeRows) {
		if (!afterRows.has(key)) {
			entries.push({ path: key, type: 'removed', before: key });
		}
	}
	for (const [key] of afterRows) {
		if (!beforeRows.has(key)) {
			entries.push({ path: key, type: 'added', after: key });
		}
	}

	const numericFields = [
		'hullIntegrity',
		'capacitor',
		'coreLife',
		'regenRate',
		'perfRatio',
		'jumpComfort',
		'scanComfort',
		'shieldCapacity',
		'shieldRegen',
		'cargo',
		'equipmentSlots',
	];

	for (const [key, beforeRow] of beforeRows) {
		const afterRow = afterRows.get(key);
		if (!afterRow) {
			continue;
		}

		for (const field of numericFields) {
			const bVal = beforeRow[field];
			const aVal = afterRow[field];
			if (bVal !== aVal) {
				const delta = numericDelta(bVal, aVal);
				entries.push({
					path: key,
					type: 'changed',
					field,
					before: bVal,
					after: aVal,
					delta,
				});
			}
		}
	}

	// Outlier changes
	const beforeOutliers = new Set(before.outliers);
	const afterOutliers = new Set(after.outliers);

	for (const o of beforeOutliers) {
		if (!afterOutliers.has(o)) {
			entries.push({
				path: 'outliers',
				type: 'removed',
				before: o,
				improvement: true,
			});
		}
	}
	for (const o of afterOutliers) {
		if (!beforeOutliers.has(o)) {
			entries.push({
				path: 'outliers',
				type: 'added',
				after: o,
				regression: true,
			});
		}
	}

	return entries;
}

// ── detection differ ─────────────────────────────────────────

interface DetectionMatrixEntry {
	wolfId: string;
	targetId: string;
	envId: string;
	[key: string]: unknown;
}

interface PvpEncounterEntry {
	id: string;
	[key: string]: unknown;
}

interface DetectionOutput {
	generated: string;
	detectionMatrix: DetectionMatrixEntry[];
	summary: Array<Record<string, unknown>>;
	pvpScanEncounters: PvpEncounterEntry[];
	combatProjections: Array<Record<string, unknown>>;
}

function detectionEntryKey(entry: DetectionMatrixEntry): string {
	return `${entry.wolfId}+${entry.targetId}+${entry.envId}`;
}

function diffDetection(
	before: DetectionOutput,
	after: DetectionOutput
): DiffEntry[] {
	const entries: DiffEntry[] = [];

	// Diff detection matrix
	const afterMatrix = new Map(
		after.detectionMatrix.map((e) => [detectionEntryKey(e), e])
	);
	const beforeMatrix = new Map(
		before.detectionMatrix.map((e) => [detectionEntryKey(e), e])
	);

	for (const [key] of beforeMatrix) {
		if (!afterMatrix.has(key)) {
			entries.push({
				path: `matrix:${key}`,
				type: 'removed',
				before: key,
			});
		}
	}
	for (const [key] of afterMatrix) {
		if (!beforeMatrix.has(key)) {
			entries.push({ path: `matrix:${key}`, type: 'added', after: key });
		}
	}

	for (const [key, beforeEntry] of beforeMatrix) {
		const afterEntry = afterMatrix.get(key);
		if (!afterEntry) {
			continue;
		}
		diffNumericLeaves(`matrix:${key}`, beforeEntry, afterEntry, entries);
	}

	// Diff PVP encounters
	const afterPvp = new Map(after.pvpScanEncounters.map((e) => [e.id, e]));
	const beforePvp = new Map(before.pvpScanEncounters.map((e) => [e.id, e]));

	for (const [id] of beforePvp) {
		if (!afterPvp.has(id)) {
			entries.push({ path: `pvp:${id}`, type: 'removed', before: id });
		}
	}
	for (const [id] of afterPvp) {
		if (!beforePvp.has(id)) {
			entries.push({ path: `pvp:${id}`, type: 'added', after: id });
		}
	}

	for (const [id, beforeEntry] of beforePvp) {
		const afterEntry = afterPvp.get(id);
		if (!afterEntry) {
			continue;
		}
		diffNumericLeaves(`pvp:${id}`, beforeEntry, afterEntry, entries);
	}

	return entries;
}

// ── Dispatch ─────────────────────────────────────────────────

function summarize(entries: DiffEntry[]): DiffResult['summary'] {
	let added = 0,
		removed = 0,
		changed = 0,
		regressions = 0,
		improvements = 0;
	for (const e of entries) {
		if (e.type === 'added') {
			added++;
		} else if (e.type === 'removed') {
			removed++;
		} else {
			changed++;
		}
		if (e.regression) {
			regressions++;
		}
		if (e.improvement) {
			improvements++;
		}
	}
	return { added, removed, changed, regressions, improvements };
}

export function diffBaseline(
	command: BaselineCommand,
	before: unknown,
	after: unknown
): DiffResult {
	const bGen = (before as { generated?: string }).generated ?? 'unknown';
	const aGen = (after as { generated?: string }).generated ?? 'unknown';

	let entries: DiffEntry[];
	switch (command) {
		case 'dsp-progress':
			entries = diffDspProgress(before as DspOutput, after as DspOutput);
			break;
		case 'analyse':
			entries = diffAnalyse(
				before as AnalyseOutput,
				after as AnalyseOutput
			);
			break;
		case 'balance':
			entries = diffBalance(
				before as BalanceOutput,
				after as BalanceOutput
			);
			break;
		case 'detection':
			entries = diffDetection(
				before as DetectionOutput,
				after as DetectionOutput
			);
			break;
	}

	return {
		command,
		baselineGenerated: bGen,
		currentGenerated: aGen,
		summary: summarize(entries),
		entries,
	};
}
