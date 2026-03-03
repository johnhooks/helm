import type { ReportContext, ReportFile } from './types';
import { heading, metaBlock, verdictBadge } from './markdown';

export function renderDspHealth(ctx: ReportContext): ReportFile {
	const lines: string[] = [];
	const { dspProgress } = ctx;
	const { summary, sections } = dspProgress;

	lines.push(heading(1, 'DSP Formula Health'));
	lines.push('');
	lines.push(metaBlock({
		'Generated': ctx.generated,
		'Source': 'runDspProgress()',
		'Total checks': summary.total,
		'Results': `${summary.pass} PASS, ${summary.warn} WARN, ${summary.fail} FAIL, ${summary.info} INFO`,
	}));
	lines.push('');

	// ── Warnings front-loaded ──
	const warnings: { section: string; goal: string; verdict: string; detail: string }[] = [];
	for (const section of sections) {
		for (const check of section.checks) {
			if (check.verdict === 'WARN' || check.verdict === 'FAIL') {
				warnings.push({
					section: section.title,
					goal: check.goal,
					verdict: check.verdict,
					detail: check.detail,
				});
			}
		}
	}

	if (warnings.length > 0) {
		lines.push(heading(2, 'Warnings & Failures'));
		lines.push('');
		// FAIL first, then WARN
		const sorted = [...warnings].sort((a, b) => {
			if (a.verdict === 'FAIL' && b.verdict !== 'FAIL') { return -1; }
			if (a.verdict !== 'FAIL' && b.verdict === 'FAIL') { return 1; }
			return 0;
		});
		for (const w of sorted) {
			lines.push(`- **${w.verdict}** — ${w.section} > ${w.goal}`);
			lines.push(`  ${w.detail}`);
			lines.push('');
		}
	}

	// ── Section-by-section breakdown ──
	lines.push(heading(2, 'Section Breakdown'));
	lines.push('');

	for (const section of sections) {
		const counts: Record<string, number> = {};
		for (const check of section.checks) {
			counts[check.verdict] = (counts[check.verdict] ?? 0) + 1;
		}

		lines.push(heading(3, `${section.title} ${verdictBadge(counts)}`));
		lines.push('');
		lines.push(`_${section.description}_`);
		lines.push('');

		// Split: actionable checks first, INFO at end
		const actionable = section.checks.filter((c) => c.verdict !== 'INFO');
		const info = section.checks.filter((c) => c.verdict === 'INFO');

		for (const check of actionable) {
			lines.push(`- **${check.verdict}** ${check.goal}`);
			lines.push(`  ${check.detail}`);
			if (check.values) {
				const vals = Object.entries(check.values)
					.map(([k, v]) => `${k}=${formatValue(v)}`)
					.join(', ');
				lines.push(`  _Values: ${vals}_`);
			}
			lines.push('');
		}

		if (info.length > 0) {
			lines.push(`<details><summary>${info.length} INFO check(s)</summary>`);
			lines.push('');
			for (const check of info) {
				lines.push(`- **INFO** ${check.goal}`);
				lines.push(`  ${check.detail}`);
				lines.push('');
			}
			lines.push('</details>');
			lines.push('');
		}
	}

	return {
		filename: 'dsp-health.md',
		content: lines.join('\n'),
	};
}

function formatValue(v: unknown): string {
	if (typeof v === 'number') {
		return Number.isInteger(v) ? String(v) : v.toFixed(4);
	}
	if (typeof v === 'object' && v !== null) {
		return JSON.stringify(v);
	}
	return String(v);
}
