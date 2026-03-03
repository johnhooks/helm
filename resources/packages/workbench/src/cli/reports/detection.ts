import type { ReportContext, ReportFile } from './types';
import { heading, table, metaBlock } from './markdown';
import { r, pct } from '../../format';

function shortenVerdict(verdict: string): string {
	if (verdict.startsWith('Easily')) { return 'easy'; }
	if (verdict.startsWith('Active only')) { return 'active-only'; }
	if (verdict.startsWith('Active fast')) { return 'active-fast'; }
	if (verdict.startsWith('Moderate')) { return 'moderate'; }
	if (verdict.startsWith('Difficult')) { return 'difficult'; }
	if (verdict.startsWith('Nearly')) { return 'undetectable'; }
	if (verdict.startsWith('Challenging')) { return 'challenging'; }
	if (verdict.startsWith('Active effective')) { return 'active-effective'; }
	return verdict.toLowerCase().slice(0, 15);
}

export function renderDetection(ctx: ReportContext): ReportFile {
	const lines: string[] = [];
	const { detection } = ctx;
	const { stats } = detection;

	lines.push(heading(1, 'Detection & Stealth'));
	lines.push('');
	lines.push(metaBlock({
		'Generated': ctx.generated,
		'Source': 'runDetection()',
		'Matrix entries': stats.totalCombinations,
		'Wolves': stats.wolvesCount,
		'Targets': stats.targetsCount,
		'Environments': stats.environmentsCount,
		'PVP encounters': stats.pvpEncounterCount,
		'Combat projections': detection.combatProjections.length,
	}));
	lines.push('');

	// ── Verdict distribution ──
	lines.push(heading(2, 'Verdict Distribution'));
	lines.push('');

	const verdictRows = Object.entries(stats.verdictCounts)
		.sort(([, a], [, b]) => b - a)
		.map(([verdict, count]) => ({
			verdict,
			count,
			pct: pct(count / stats.totalCombinations),
		}));

	lines.push(table(
		[
			['Verdict', 'verdict'],
			['Count', 'count'],
			['%', 'pct'],
		],
		verdictRows,
	));
	lines.push('');

	// ── Per-wolf summary (aggregated) ──
	lines.push(heading(2, 'Per-Wolf Summary'));
	lines.push('');

	for (const wolf of detection.wolves) {
		const wolfSummary = detection.summary.filter((s) => s.wolfId === wolf.id);
		const wolfVerdicts: Record<string, number> = {};
		for (const s of wolfSummary) {
			const short = shortenVerdict(s.verdict);
			wolfVerdicts[short] = (wolfVerdicts[short] ?? 0) + 1;
		}

		const badge = Object.entries(wolfVerdicts)
			.sort(([, a], [, b]) => b - a)
			.map(([v, n]) => `${n} ${v}`)
			.join(' / ');

		lines.push(heading(3, `${wolf.label} [${badge}]`));
		lines.push('');

		// Aggregate by target: show best environment result
		const byTarget = new Map<string, typeof wolfSummary>();
		for (const s of wolfSummary) {
			const existing = byTarget.get(s.targetId) ?? [];
			existing.push(s);
			byTarget.set(s.targetId, existing);
		}

		const targetRows = [...byTarget.entries()].map(([targetId, entries]) => {
			// Find "normal" environment result
			const normal = entries.find((e) => e.envId === 'normal') ?? entries[0];
			return {
				target: targetId,
				active4: r(normal.active_4sweeps, 2),
				active10: r(normal.active_10sweeps, 2),
				passive4hr: r(normal.passive_4hr, 2),
				passive24hr: r(normal.passive_24hr, 2),
				bestActive: normal.bestActiveAt !== null ? `${normal.bestActiveAt} sweeps` : '—',
				bestPassive: normal.bestPassiveAt ?? '—',
				verdict: normal.verdict,
			};
		});

		lines.push(table(
			[
				['Target', 'target'],
				['Active @4', 'active4'],
				['Active @10', 'active10'],
				['Passive @4hr', 'passive4hr'],
				['Passive @24hr', 'passive24hr'],
				['Best Active', 'bestActive'],
				['Best Passive', 'bestPassive'],
				['Verdict', 'verdict'],
			],
			targetRows,
		));
		lines.push('');
	}

	// ── Environment impact ──
	lines.push(heading(2, 'Environment Impact'));
	lines.push('');

	const envRows = detection.environments.map((env) => {
		const envEntries = detection.summary.filter((s) => s.envId === env.id);
		const avgActive4 = envEntries.reduce((sum, e) => sum + e.active_4sweeps, 0) / envEntries.length;
		const avgPassive4 = envEntries.reduce((sum, e) => sum + e.passive_4hr, 0) / envEntries.length;
		return {
			env: env.label,
			noise: r(env.noise, 2),
			avgActive4: r(avgActive4, 3),
			avgPassive4hr: r(avgPassive4, 3),
		};
	});

	lines.push(table(
		[
			['Environment', 'env'],
			['Noise', 'noise'],
			['Avg Active @4', 'avgActive4'],
			['Avg Passive @4hr', 'avgPassive4hr'],
		],
		envRows,
	));
	lines.push('');

	// ── PVP Scan Encounters ──
	lines.push(heading(2, 'PVP Scan Encounters'));
	lines.push('');

	for (const encounter of detection.pvpScanEncounters) {
		lines.push(heading(3, encounter.label));
		lines.push('');

		// Wolf scan summary
		const wolfScan = encounter.wolfScan;
		lines.push(`**Wolf scan:** per-scan chance ${r(wolfScan.perScanChance, 3)}, `
			+ `70% at ${wolfScan.scansFor70 ?? 'never'} scans, `
			+ `90% at ${wolfScan.scansFor90 ?? 'never'} scans, `
			+ `max ${wolfScan.maxScansBeforeDry} scans before dry`);
		lines.push('');

		// Counter-detection
		const firstDetect = encounter.counterDetection.steps.find((s) => s.tier !== 'none');
		if (firstDetect) {
			lines.push(`**Counter-detection:** target detects wolf at scan ${firstDetect.scan} `
				+ `(${firstDetect.elapsedSeconds}s, tier: ${firstDetect.tier}, confidence: ${r(firstDetect.targetConfidence, 2)})`);
		} else {
			lines.push('**Counter-detection:** target never detects wolf');
		}
		lines.push('');

		// Race verdict
		lines.push(`**Race:** ${encounter.race.verdict}`);
		lines.push('');

		// Combat resolution (if available)
		if (encounter.combatResolution) {
			const combat = encounter.combatResolution;
			lines.push(`**Combat:** ${combat.outcome.verdict}`);
			lines.push('');
		}
	}

	// ── Combat Projections ──
	lines.push(heading(2, 'Combat Projections'));
	lines.push('');

	const combatRows = detection.combatProjections.map((cp) => ({
		wolf: cp.wolfId,
		target: `${cp.targetHull} (${cp.targetHullIntegrity}HP + ${cp.targetShieldCapacity}S)`,
		phaserDrain: `${cp.phaser.netDrainPerHour}/hr`,
		shieldDepletion: cp.phaser.canDepleteShields ? `${cp.phaser.hoursToDeplete}hr` : 'never',
		torpHits: `${cp.torpedo.expectedHits}/${cp.torpedo.magazineSize}`,
		torpDamage: r(cp.torpedo.expectedTotalDamage, 0),
		canKill: cp.torpedo.canKill ? 'yes' : 'no',
	}));

	lines.push(table(
		[
			['Wolf', 'wolf'],
			['Target', 'target'],
			['Phaser Net Drain', 'phaserDrain'],
			['Shield Depletion', 'shieldDepletion'],
			['Torpedo Hits', 'torpHits'],
			['Torpedo Damage', 'torpDamage'],
			['Can Kill?', 'canKill'],
		],
		combatRows,
	));
	lines.push('');

	return {
		filename: 'detection-stealth.md',
		content: lines.join('\n'),
	};
}
