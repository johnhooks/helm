import type { ReportContext, ReportFile } from './types';
import { heading, table, metaBlock, flag, hr, verdictBadge } from './markdown';

export function renderSummary(ctx: ReportContext): ReportFile {
	const lines: string[] = [];

	lines.push(heading(1, 'Helm Workbench Report'));
	lines.push('');
	lines.push(metaBlock({
		'Generated': ctx.generated,
		'DSP checks': ctx.dspProgress.summary.total,
		'Balance rows': ctx.balance.rows.length,
		'Detection matrix': ctx.detection.stats.totalCombinations,
		'Baselines': ctx.diffs ? 'available' : 'none (run `bun run wb baseline save --all`)',
	}));
	lines.push('');

	// ── At a Glance ──
	lines.push(heading(2, 'At a Glance'));
	lines.push('');

	const { summary } = ctx.dspProgress;
	lines.push(`- **DSP Health:** ${verdictBadge({ PASS: summary.pass, WARN: summary.warn, FAIL: summary.fail, INFO: summary.info })}`);
	lines.push(`- **Balance Outliers:** ${ctx.balance.outliers.length}`);

	const verdictDist = Object.entries(ctx.detection.stats.verdictCounts)
		.map(([v, n]) => `${n} ${v.toLowerCase()}`)
		.join(', ');
	lines.push(`- **Detection Verdicts:** ${verdictDist}`);

	if (ctx.diffs) {
		const totalChanges = ctx.diffs.reduce((n, d) => n + d.entries.length, 0);
		const totalRegressions = ctx.diffs.reduce((n, d) => n + d.summary.regressions, 0);
		const totalImprovements = ctx.diffs.reduce((n, d) => n + d.summary.improvements, 0);
		lines.push(`- **Regressions:** ${totalRegressions} regression(s), ${totalImprovements} improvement(s), ${totalChanges} total change(s)`);
	}

	lines.push('');

	// ── Attention Required ──
	const attentionItems: string[] = [];

	// FAIL verdicts
	for (const section of ctx.dspProgress.sections) {
		for (const check of section.checks) {
			if (check.verdict === 'FAIL') {
				attentionItems.push(flag(`FAIL — ${section.title} > ${check.goal}: ${check.detail}`));
			}
		}
	}

	// WARN verdicts
	for (const section of ctx.dspProgress.sections) {
		for (const check of section.checks) {
			if (check.verdict === 'WARN') {
				attentionItems.push(flag(`WARN — ${section.title} > ${check.goal}: ${check.detail}`));
			}
		}
	}

	// Balance outliers
	for (const outlier of ctx.balance.outliers) {
		attentionItems.push(flag(`OUTLIER — ${outlier}`));
	}

	// Regressions from baseline
	if (ctx.diffs) {
		for (const diff of ctx.diffs) {
			for (const entry of diff.entries) {
				if (entry.regression) {
					const location = entry.field ? `${entry.path} > ${entry.field}` : entry.path;
					attentionItems.push(flag(`REGRESSION — ${diff.command}: ${location} (${JSON.stringify(entry.before)} → ${JSON.stringify(entry.after)})`));
				}
			}
		}
	}

	if (attentionItems.length > 0) {
		lines.push(heading(2, 'Attention Required'));
		lines.push('');
		for (const item of attentionItems) {
			lines.push(item);
			lines.push('');
		}
	} else {
		lines.push(heading(2, 'Attention Required'));
		lines.push('');
		lines.push('_No issues found. All DSP checks passing, no outliers, no regressions._');
		lines.push('');
	}

	// ── Hull Overview ──
	lines.push(heading(2, 'Hull Overview'));
	lines.push('');

	const hullRows = ctx.balance.rows.map((row) => ({
		hull: row.hull,
		integrity: row.hullIntegrity,
		capacitor: row.capacitor,
		coreLife: row.coreLife,
		regenRate: row.regenRate,
		perfRatio: row.perfRatio,
		jumpComfort: row.jumpComfort,
		scanComfort: row.scanComfort,
		shieldCap: row.shieldCapacity,
		shieldRegen: row.shieldRegen,
		cargo: row.cargo,
		slots: row.equipmentSlots,
	}));

	lines.push(table(
		[
			['Hull', 'hull'],
			['Integrity', 'integrity'],
			['Capacitor', 'capacitor'],
			['Core Life', 'coreLife'],
			['Regen/hr', 'regenRate'],
			['perfRatio', 'perfRatio'],
			['Jump Comfort', 'jumpComfort'],
			['Scan Comfort', 'scanComfort'],
			['Shield Cap', 'shieldCap'],
			['Shield Regen', 'shieldRegen'],
			['Cargo', 'cargo'],
			['Slots', 'slots'],
		],
		hullRows,
	));
	lines.push('');

	// ── Links ──
	lines.push(hr());
	lines.push(heading(2, 'Deep-Dive Reports'));
	lines.push('');
	lines.push('- [Hull & Component Balance](hull-balance.md)');
	lines.push('- [Detection & Stealth](detection-stealth.md)');
	lines.push('- [DSP Formula Health](dsp-health.md)');
	if (ctx.diffs) {
		lines.push('- [Regression Report](regression.md)');
	}
	lines.push('');

	return {
		filename: 'index.md',
		content: lines.join('\n'),
	};
}
