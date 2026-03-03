import type { ReportContext, ReportFile } from './types';
import { heading, table, metaBlock } from './markdown';

export function renderRegression(ctx: ReportContext): ReportFile {
	const lines: string[] = [];
	const diffs = ctx.diffs!;

	lines.push(heading(1, 'Regression Report'));
	lines.push('');
	lines.push(metaBlock({
		'Generated': ctx.generated,
		'Source': 'diffBaseline() for all 4 commands',
		'Baselines compared': diffs.map((d) => d.command).join(', '),
	}));
	lines.push('');

	// ── Summary table ──
	lines.push(heading(2, 'Summary'));
	lines.push('');

	const summaryRows = diffs.map((d) => ({
		command: d.command,
		baseline: d.baselineGenerated,
		changes: d.entries.length,
		regressions: d.summary.regressions,
		improvements: d.summary.improvements,
		added: d.summary.added,
		removed: d.summary.removed,
	}));

	lines.push(table(
		[
			['Command', 'command'],
			['Baseline', 'baseline'],
			['Changes', 'changes'],
			['Regressions', 'regressions'],
			['Improvements', 'improvements'],
			['Added', 'added'],
			['Removed', 'removed'],
		],
		summaryRows,
	));
	lines.push('');

	// ── Regressions ──
	const allRegressions = diffs.flatMap((d) =>
		d.entries.filter((e) => e.regression).map((e) => ({ command: d.command, entry: e })),
	);

	if (allRegressions.length > 0) {
		lines.push(heading(2, 'Regressions'));
		lines.push('');
		for (const { command, entry } of allRegressions) {
			const location = entry.field ? `${entry.path} > ${entry.field}` : entry.path;
			if (entry.delta !== undefined) {
				const sign = entry.delta > 0 ? '+' : '';
				lines.push(`- **${command}** — ${location}: ${entry.before} → ${entry.after} (${sign}${entry.delta})`);
			} else {
				lines.push(`- **${command}** — ${location}: ${JSON.stringify(entry.before)} → ${JSON.stringify(entry.after)}`);
			}
		}
		lines.push('');
	}

	// ── Improvements ──
	const allImprovements = diffs.flatMap((d) =>
		d.entries.filter((e) => e.improvement).map((e) => ({ command: d.command, entry: e })),
	);

	if (allImprovements.length > 0) {
		lines.push(heading(2, 'Improvements'));
		lines.push('');
		for (const { command, entry } of allImprovements) {
			const location = entry.field ? `${entry.path} > ${entry.field}` : entry.path;
			if (entry.delta !== undefined) {
				const sign = entry.delta > 0 ? '+' : '';
				lines.push(`- **${command}** — ${location}: ${entry.before} → ${entry.after} (${sign}${entry.delta})`);
			} else {
				lines.push(`- **${command}** — ${location}: ${JSON.stringify(entry.before)} → ${JSON.stringify(entry.after)}`);
			}
		}
		lines.push('');
	}

	// ── Other changes ──
	const otherChanges = diffs.flatMap((d) =>
		d.entries.filter((e) => !e.regression && !e.improvement).map((e) => ({ command: d.command, entry: e })),
	);

	if (otherChanges.length > 0) {
		lines.push(heading(2, 'Other Changes'));
		lines.push('');

		// Group by command
		const byCommand = new Map<string, typeof otherChanges>();
		for (const change of otherChanges) {
			const existing = byCommand.get(change.command) ?? [];
			existing.push(change);
			byCommand.set(change.command, existing);
		}

		for (const [command, changes] of byCommand) {
			lines.push(heading(3, `${command} (${changes.length} changes)`));
			lines.push('');

			// Limit to first 50 to keep report readable
			const shown = changes.slice(0, 50);
			for (const { entry } of shown) {
				const location = entry.field ? `${entry.path} > ${entry.field}` : entry.path;
				if (entry.type === 'added') {
					lines.push(`- ADDED: ${location} = ${JSON.stringify(entry.after)}`);
				} else if (entry.type === 'removed') {
					lines.push(`- REMOVED: ${location} (was ${JSON.stringify(entry.before)})`);
				} else if (entry.delta !== undefined) {
					const sign = entry.delta > 0 ? '+' : '';
					lines.push(`- ${location}: ${entry.before} → ${entry.after} (${sign}${entry.delta})`);
				} else {
					lines.push(`- ${location}: ${JSON.stringify(entry.before)} → ${JSON.stringify(entry.after)}`);
				}
			}

			if (changes.length > 50) {
				lines.push(`- _...and ${changes.length - 50} more_`);
			}
			lines.push('');
		}
	}

	if (allRegressions.length === 0 && allImprovements.length === 0 && otherChanges.length === 0) {
		lines.push('_No changes detected since baseline._');
		lines.push('');
	}

	return {
		filename: 'regression.md',
		content: lines.join('\n'),
	};
}
