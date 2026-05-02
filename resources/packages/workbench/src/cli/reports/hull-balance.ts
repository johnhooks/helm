import type { ReportContext, ReportFile } from './types';
import { heading, table, metaBlock, flag } from './markdown';
import { r } from '../../format';

export function renderHullBalance(ctx: ReportContext): ReportFile {
	const lines: string[] = [];
	const { balance, analyse } = ctx;

	lines.push(heading(1, 'Hull & Component Balance'));
	lines.push('');
	lines.push(
		metaBlock({
			Generated: ctx.generated,
			Sources: 'runBalance(), runAnalyse()',
			'Balance rows': balance.rows.length,
			Outliers: balance.outliers.length,
			'Analysis categories': analyse.categories.length,
		})
	);
	lines.push('');

	// ── Outlier analysis ──
	if (balance.outliers.length > 0) {
		lines.push(heading(2, 'Outliers'));
		lines.push('');
		for (const outlier of balance.outliers) {
			lines.push(flag(outlier));
			lines.push('');
		}
	}

	// ── Full balance matrix ──
	lines.push(heading(2, 'Balance Matrix'));
	lines.push('');

	const matrixColumns: [string, string][] = [
		['Hull', 'hull'],
		['Integrity', 'hullIntegrity'],
		['Capacitor', 'capacitor'],
		['Core Life', 'coreLife'],
		['Regen/hr', 'regenRate'],
		['perfRatio', 'perfRatio'],
		['Jump Comfort', 'jumpComfort'],
		['Scan Comfort', 'scanComfort'],
		['Shield Cap', 'shieldCapacity'],
		['Shield Regen', 'shieldRegen'],
		['Cargo', 'cargo'],
		['Slots', 'equipmentSlots'],
	];

	// Include core/drive columns if varying
	if (balance.rows.some((row) => row.core)) {
		matrixColumns.splice(1, 0, ['Core', 'core']);
	}
	if (balance.rows.some((row) => row.drive)) {
		matrixColumns.splice(balance.rows.some((row) => row.core) ? 2 : 1, 0, [
			'Drive',
			'drive',
		]);
	}

	lines.push(
		table(
			matrixColumns,
			balance.rows as unknown as Record<string, unknown>[]
		)
	);
	lines.push('');

	// ── Core × Drive compatibility ──
	const coreDriveCategory = analyse.categories.find(
		(c) => c.category === 'Core x Drive Matrix'
	);
	if (coreDriveCategory) {
		lines.push(heading(2, 'Core × Drive Compatibility'));
		lines.push('');
		lines.push(`_${coreDriveCategory.description}_`);
		lines.push('');

		const allRows = coreDriveCategory.scenarios.map((s) => ({
			combo: s.name,
			perfRatio: r(s.output.power.perfRatio, 3),
			capacitor: s.output.power.capacitor,
			regenRate: r(s.output.power.regenRate, 1),
			jumpComfort: r(s.output.jump.comfortRange, 1),
		}));

		const constrained = allRows.filter((row) => row.perfRatio < 1);
		const optimal = allRows.length - constrained.length;

		lines.push(
			`${optimal} of ${allRows.length} combos run at perfRatio=1.0 (fully matched). ` +
				`${constrained.length} combos are drive-constrained:`
		);
		lines.push('');

		lines.push(
			table(
				[
					['Combo', 'combo'],
					['perfRatio', 'perfRatio'],
					['Capacitor', 'capacitor'],
					['Regen/hr', 'regenRate'],
					['Jump Comfort', 'jumpComfort'],
				],
				constrained.sort((a, b) => a.perfRatio - b.perfRatio)
			)
		);
		lines.push('');
	}

	// ── Power Budget ──
	const powerBudget = analyse.categories.find(
		(c) => c.category === 'Power Budget Validation'
	);
	if (powerBudget) {
		lines.push(heading(2, 'Power Budget Validation'));
		lines.push('');
		lines.push(`_${powerBudget.description}_`);
		lines.push('');
		for (const s of powerBudget.scenarios) {
			lines.push(`- **${s.name}** — ${s.description}`);
		}
		lines.push('');
	}

	// ── Hull Specializations ──
	const hullSpecs = analyse.categories.find(
		(c) => c.category === 'Hull Specializations'
	);
	if (hullSpecs) {
		lines.push(heading(2, 'Hull Specializations'));
		lines.push('');
		lines.push(`_${hullSpecs.description}_`);
		lines.push('');
		for (const s of hullSpecs.scenarios) {
			lines.push(`- **${s.name}** — ${s.description}`);
		}
		lines.push('');
	}

	// ── Crossover Products ──
	const crossovers = analyse.categories.find(
		(c) => c.category === 'Crossover Products'
	);
	if (crossovers) {
		lines.push(heading(2, 'Crossover Products'));
		lines.push('');
		lines.push(`_${crossovers.description}_`);
		lines.push('');

		const crossRows = crossovers.scenarios.map((s) => ({
			name: s.name,
			perfRatio: r(s.output.power.perfRatio, 3),
			jumpComfort: r(s.output.jump.comfortRange, 1),
			scanComfort: r(s.output.scan.comfortRange, 1),
			shieldCap: s.output.shield.capacity,
			cargo: s.output.footprint.cargo,
		}));

		lines.push(
			table(
				[
					['Loadout', 'name'],
					['perfRatio', 'perfRatio'],
					['Jump Comfort', 'jumpComfort'],
					['Scan Comfort', 'scanComfort'],
					['Shield Cap', 'shieldCap'],
					['Cargo', 'cargo'],
				],
				crossRows
			)
		);
		lines.push('');
	}

	// ── Core Lifecycle ──
	const coreLifecycle = analyse.categories.find(
		(c) => c.category === 'Core Lifecycle'
	);
	if (coreLifecycle) {
		lines.push(heading(2, 'Core Lifecycle'));
		lines.push('');
		lines.push(`_${coreLifecycle.description}_`);
		lines.push('');

		// Show only throttle=1.0 scenarios (the finite jump counts)
		const finiteScenarios = coreLifecycle.scenarios.filter((s) =>
			s.name.includes('throttle=1.0')
		);
		const lifecycleRows = finiteScenarios.map((s) => {
			const jump5 = s.output.jump.sampleJumps.find(
				(j: { distance: number }) => j.distance === 5
			);
			const coreCost = jump5?.coreCost ?? 0;
			const jumps =
				coreCost > 0
					? Math.floor(s.output.power.coreLife / coreCost)
					: Infinity;
			return {
				combo: s.name.replace(' @ throttle=1.0', ''),
				coreLife: s.output.power.coreLife,
				coreCost: r(coreCost, 2),
				jumps: jumps === Infinity ? '∞' : String(jumps),
			};
		});

		lines.push(
			table(
				[
					['Combo', 'combo'],
					['Core Life', 'coreLife'],
					['Cost/5ly Jump', 'coreCost'],
					['Jumps Until Death', 'jumps'],
				],
				lifecycleRows
			)
		);
		lines.push('');
	}

	// ── Edge Cases ──
	const edgeCases = analyse.categories.find(
		(c) => c.category === 'Edge Cases'
	);
	if (edgeCases) {
		lines.push(heading(2, 'Edge Cases'));
		lines.push('');
		lines.push(`_${edgeCases.description}_`);
		lines.push('');
		for (const s of edgeCases.scenarios) {
			lines.push(`- **${s.name}** — ${s.description}`);
		}
		lines.push('');
	}

	return {
		filename: 'hull-balance.md',
		content: lines.join('\n'),
	};
}
