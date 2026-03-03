/**
 * Shared markdown rendering helpers for report generation.
 */

/**
 * Markdown heading at the given level.
 */
export function heading(level: number, text: string): string {
	return `${'#'.repeat(level)} ${text}`;
}

/**
 * Render a markdown table from rows of key-value objects.
 * Columns are specified as [header, key] pairs.
 */
export function table(columns: [string, string][], rows: Record<string, unknown>[]): string {
	if (rows.length === 0) { return '_No data._\n'; }

	const headers = columns.map(([h]) => h);
	const keys = columns.map(([, k]) => k);

	const lines: string[] = [];
	lines.push(`| ${headers.join(' | ')} |`);
	lines.push(`| ${headers.map(() => '---').join(' | ')} |`);

	for (const row of rows) {
		const cells = keys.map((k) => {
			const v = row[k];
			if (v === null || v === undefined) { return '—'; }
			if (typeof v === 'number') { return String(v); }
			return String(v);
		});
		lines.push(`| ${cells.join(' | ')} |`);
	}

	return lines.join('\n') + '\n';
}

/**
 * Verdict badge for section headings: [35 PASS / 9 WARN / 0 FAIL]
 */
export function verdictBadge(counts: Record<string, number>): string {
	const parts: string[] = [];
	if (counts.PASS) { parts.push(`${counts.PASS} PASS`); }
	if (counts.WARN) { parts.push(`${counts.WARN} WARN`); }
	if (counts.FAIL) { parts.push(`${counts.FAIL} FAIL`); }
	if (counts.INFO) { parts.push(`${counts.INFO} INFO`); }
	return `[${parts.join(' / ')}]`;
}

/**
 * Metadata block at the top of a report.
 */
export function metaBlock(fields: Record<string, string | number>): string {
	const lines = Object.entries(fields).map(([k, v]) => `- **${k}:** ${v}`);
	return lines.join('\n') + '\n';
}

/**
 * Flagged attention item.
 */
export function flag(message: string): string {
	return `**FLAG:** ${message}`;
}

/**
 * Horizontal rule.
 */
export function hr(): string {
	return '---\n';
}
