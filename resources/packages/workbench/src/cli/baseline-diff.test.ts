import { describe, it, expect } from 'vitest';
import { diffBaseline } from './baseline-diff';

describe('baseline diff engine', () => {
	describe('dsp-progress', () => {
		const base = (sections: unknown[]) => ({
			generated: '2024-01-01T00:00:00Z',
			summary: { pass: 0, warn: 0, fail: 0, info: 0, total: 0 },
			sections,
		});

		it('reports no changes for identical data', () => {
			const data = base([
				{
					title: 'Section A',
					description: '',
					checks: [
						{
							goal: 'Check 1',
							verdict: 'PASS',
							detail: '',
							values: { x: 1 },
						},
					],
				},
			]);
			const result = diffBaseline('dsp-progress', data, data);
			expect(result.entries).toHaveLength(0);
			expect(result.summary.regressions).toBe(0);
		});

		it('detects verdict regression (PASS → WARN)', () => {
			const before = base([
				{
					title: 'Section A',
					description: '',
					checks: [{ goal: 'Check 1', verdict: 'PASS', detail: '' }],
				},
			]);
			const after = base([
				{
					title: 'Section A',
					description: '',
					checks: [{ goal: 'Check 1', verdict: 'WARN', detail: '' }],
				},
			]);
			const result = diffBaseline('dsp-progress', before, after);
			expect(result.entries).toHaveLength(1);
			expect(result.entries[0].regression).toBe(true);
			expect(result.entries[0].improvement).toBe(false);
			expect(result.summary.regressions).toBe(1);
		});

		it('detects verdict improvement (FAIL → PASS)', () => {
			const before = base([
				{
					title: 'Section A',
					description: '',
					checks: [{ goal: 'Check 1', verdict: 'FAIL', detail: '' }],
				},
			]);
			const after = base([
				{
					title: 'Section A',
					description: '',
					checks: [{ goal: 'Check 1', verdict: 'PASS', detail: '' }],
				},
			]);
			const result = diffBaseline('dsp-progress', before, after);
			expect(result.entries).toHaveLength(1);
			expect(result.entries[0].improvement).toBe(true);
			expect(result.entries[0].regression).toBe(false);
			expect(result.summary.improvements).toBe(1);
		});

		it('treats INFO transitions as neutral', () => {
			const before = base([
				{
					title: 'S',
					description: '',
					checks: [{ goal: 'G', verdict: 'PASS', detail: '' }],
				},
			]);
			const after = base([
				{
					title: 'S',
					description: '',
					checks: [{ goal: 'G', verdict: 'INFO', detail: '' }],
				},
			]);
			const result = diffBaseline('dsp-progress', before, after);
			expect(result.entries[0].regression).toBe(false);
			expect(result.entries[0].improvement).toBe(false);
		});

		it('detects added and removed checks', () => {
			const before = base([
				{
					title: 'S',
					description: '',
					checks: [
						{ goal: 'Old check', verdict: 'PASS', detail: '' },
						{ goal: 'Shared check', verdict: 'PASS', detail: '' },
					],
				},
			]);
			const after = base([
				{
					title: 'S',
					description: '',
					checks: [
						{ goal: 'Shared check', verdict: 'PASS', detail: '' },
						{ goal: 'New check', verdict: 'WARN', detail: '' },
					],
				},
			]);
			const result = diffBaseline('dsp-progress', before, after);
			const removed = result.entries.find((e) => e.type === 'removed');
			const added = result.entries.find((e) => e.type === 'added');
			expect(removed).toBeDefined();
			expect(removed!.before).toBe('Old check');
			expect(added).toBeDefined();
			expect(added!.after).toBe('New check');
		});

		it('diffs numeric values and reports deltas', () => {
			const before = base([
				{
					title: 'S',
					description: '',
					checks: [
						{
							goal: 'G',
							verdict: 'PASS',
							detail: '',
							values: { x: 1.5, y: 10 },
						},
					],
				},
			]);
			const after = base([
				{
					title: 'S',
					description: '',
					checks: [
						{
							goal: 'G',
							verdict: 'PASS',
							detail: '',
							values: { x: 2.0, y: 10 },
						},
					],
				},
			]);
			const result = diffBaseline('dsp-progress', before, after);
			expect(result.entries).toHaveLength(1);
			expect(result.entries[0].field).toBe('x');
			expect(result.entries[0].delta).toBe(0.5);
		});

		it('detects added and removed sections', () => {
			const before = base([
				{ title: 'Old Section', description: '', checks: [] },
				{ title: 'Shared', description: '', checks: [] },
			]);
			const after = base([
				{ title: 'Shared', description: '', checks: [] },
				{ title: 'New Section', description: '', checks: [] },
			]);
			const result = diffBaseline('dsp-progress', before, after);
			expect(
				result.entries.find((e) => e.type === 'removed')
			).toBeDefined();
			expect(
				result.entries.find((e) => e.type === 'added')
			).toBeDefined();
		});
	});

	describe('analyse', () => {
		const base = (categories: unknown[]) => ({
			generated: '2024-01-01T00:00:00Z',
			defaults: {},
			categories,
		});

		it('reports no changes for identical data', () => {
			const data = base([
				{
					category: 'Baseline',
					description: '',
					scenarios: [
						{
							name: 'S1',
							input: {},
							output: { power: { capacitor: 100 } },
						},
					],
				},
			]);
			const result = diffBaseline('analyse', data, data);
			expect(result.entries).toHaveLength(0);
		});

		it('detects numeric changes in scenario output', () => {
			const before = base([
				{
					category: 'Baseline',
					description: '',
					scenarios: [
						{
							name: 'S1',
							input: {},
							output: {
								power: { capacitor: 100, coreLife: 500 },
							},
						},
					],
				},
			]);
			const after = base([
				{
					category: 'Baseline',
					description: '',
					scenarios: [
						{
							name: 'S1',
							input: {},
							output: {
								power: { capacitor: 110, coreLife: 500 },
							},
						},
					],
				},
			]);
			const result = diffBaseline('analyse', before, after);
			expect(result.entries).toHaveLength(1);
			expect(result.entries[0].delta).toBe(10);
		});

		it('detects added/removed categories', () => {
			const before = base([
				{ category: 'A', description: '', scenarios: [] },
			]);
			const after = base([
				{ category: 'B', description: '', scenarios: [] },
			]);
			const result = diffBaseline('analyse', before, after);
			expect(
				result.entries.filter((e) => e.type === 'removed')
			).toHaveLength(1);
			expect(
				result.entries.filter((e) => e.type === 'added')
			).toHaveLength(1);
		});

		it('detects added/removed scenarios within a category', () => {
			const before = base([
				{
					category: 'C',
					description: '',
					scenarios: [{ name: 'Old', input: {}, output: {} }],
				},
			]);
			const after = base([
				{
					category: 'C',
					description: '',
					scenarios: [{ name: 'New', input: {}, output: {} }],
				},
			]);
			const result = diffBaseline('analyse', before, after);
			expect(
				result.entries.filter((e) => e.type === 'removed')
			).toHaveLength(1);
			expect(
				result.entries.filter((e) => e.type === 'added')
			).toHaveLength(1);
		});
	});

	describe('balance', () => {
		const base = (rows: unknown[], outliers: string[] = []) => ({
			generated: '2024-01-01T00:00:00Z',
			vary: 'hull',
			tuning: {},
			rows,
			outliers,
		});

		it('reports no changes for identical data', () => {
			const data = base([
				{ hull: 'pioneer', capacitor: 100, perfRatio: 1.0 },
			]);
			const result = diffBaseline('balance', data, data);
			expect(result.entries).toHaveLength(0);
		});

		it('detects numeric field changes', () => {
			const before = base([
				{ hull: 'pioneer', capacitor: 100, perfRatio: 1.0 },
			]);
			const after = base([
				{ hull: 'pioneer', capacitor: 110, perfRatio: 1.0 },
			]);
			const result = diffBaseline('balance', before, after);
			expect(result.entries).toHaveLength(1);
			expect(result.entries[0].field).toBe('capacitor');
			expect(result.entries[0].delta).toBe(10);
		});

		it('matches rows by composite key (hull + core + drive)', () => {
			const before = base([
				{
					hull: 'pioneer',
					core: 'epoch_s',
					drive: 'dr_505',
					capacitor: 100,
				},
				{
					hull: 'scout',
					core: 'epoch_e',
					drive: 'dr_305',
					capacitor: 80,
				},
			]);
			const after = base([
				{
					hull: 'scout',
					core: 'epoch_e',
					drive: 'dr_305',
					capacitor: 85,
				},
				{
					hull: 'pioneer',
					core: 'epoch_s',
					drive: 'dr_505',
					capacitor: 100,
				},
			]);
			const result = diffBaseline('balance', before, after);
			expect(result.entries).toHaveLength(1);
			expect(result.entries[0].path).toBe('scout+epoch_e+dr_305');
			expect(result.entries[0].delta).toBe(5);
		});

		it('detects new outliers as regressions', () => {
			const before = base([{ hull: 'pioneer' }], []);
			const after = base(
				[{ hull: 'pioneer' }],
				['OUTLIER: pioneer — perfRatio=0.5']
			);
			const result = diffBaseline('balance', before, after);
			const added = result.entries.find(
				(e) => e.type === 'added' && e.path === 'outliers'
			);
			expect(added).toBeDefined();
			expect(added!.regression).toBe(true);
		});

		it('detects removed outliers as improvements', () => {
			const before = base(
				[{ hull: 'pioneer' }],
				['OUTLIER: pioneer — perfRatio=0.5']
			);
			const after = base([{ hull: 'pioneer' }], []);
			const result = diffBaseline('balance', before, after);
			const removed = result.entries.find(
				(e) => e.type === 'removed' && e.path === 'outliers'
			);
			expect(removed).toBeDefined();
			expect(removed!.improvement).toBe(true);
		});

		it('detects added/removed rows', () => {
			const before = base([
				{ hull: 'pioneer', capacitor: 100 },
				{ hull: 'scout', capacitor: 80 },
			]);
			const after = base([
				{ hull: 'pioneer', capacitor: 100 },
				{ hull: 'bulwark', capacitor: 120 },
			]);
			const result = diffBaseline('balance', before, after);
			expect(
				result.entries.find(
					(e) => e.type === 'removed' && e.path === 'scout'
				)
			).toBeDefined();
			expect(
				result.entries.find(
					(e) => e.type === 'added' && e.path === 'bulwark'
				)
			).toBeDefined();
		});
	});

	describe('detection', () => {
		const base = (matrix: unknown[] = [], pvp: unknown[] = []) => ({
			generated: '2024-01-01T00:00:00Z',
			config: {},
			wolves: [],
			targets: [],
			environments: [],
			detectionMatrix: matrix,
			summary: [],
			pvpScanEncounters: pvp,
			combatProjections: [],
			stats: {},
		});

		it('reports no changes for identical data', () => {
			const data = base(
				[
					{
						wolfId: 'w1',
						targetId: 't1',
						envId: 'e1',
						active: { sweeps_4: 0.7 },
					},
				],
				[{ id: 'pvp1', race: { verdict: 'Wolf fires first' } }]
			);
			const result = diffBaseline('detection', data, data);
			expect(result.entries).toHaveLength(0);
		});

		it('detects numeric changes in matrix entries', () => {
			const before = base([
				{
					wolfId: 'w1',
					targetId: 't1',
					envId: 'e1',
					active: { sweeps_4: 0.7 },
				},
			]);
			const after = base([
				{
					wolfId: 'w1',
					targetId: 't1',
					envId: 'e1',
					active: { sweeps_4: 0.8 },
				},
			]);
			const result = diffBaseline('detection', before, after);
			expect(result.entries).toHaveLength(1);
			expect(result.entries[0].delta).toBeCloseTo(0.1);
		});

		it('matches matrix entries by wolfId+targetId+envId', () => {
			const before = base([
				{ wolfId: 'w1', targetId: 't1', envId: 'e1', value: 1 },
				{ wolfId: 'w2', targetId: 't1', envId: 'e1', value: 2 },
			]);
			const after = base([
				{ wolfId: 'w2', targetId: 't1', envId: 'e1', value: 3 },
				{ wolfId: 'w1', targetId: 't1', envId: 'e1', value: 1 },
			]);
			const result = diffBaseline('detection', before, after);
			expect(result.entries).toHaveLength(1);
			expect(result.entries[0].path).toContain('w2+t1+e1');
		});

		it('detects added/removed PVP encounters', () => {
			const before = base([], [{ id: 'old', race: {} }]);
			const after = base([], [{ id: 'new', race: {} }]);
			const result = diffBaseline('detection', before, after);
			expect(
				result.entries.find((e) => e.type === 'removed')
			).toBeDefined();
			expect(
				result.entries.find((e) => e.type === 'added')
			).toBeDefined();
		});

		it('detects PVP encounter field changes', () => {
			const before = base(
				[],
				[{ id: 'pvp1', wolfScan: { perSweepChance: 0.3 } }]
			);
			const after = base(
				[],
				[{ id: 'pvp1', wolfScan: { perSweepChance: 0.4 } }]
			);
			const result = diffBaseline('detection', before, after);
			expect(result.entries).toHaveLength(1);
			expect(result.entries[0].delta).toBeCloseTo(0.1);
		});
	});

	describe('summary', () => {
		it('counts added, removed, changed, regressions, improvements', () => {
			const before = {
				generated: '2024-01-01T00:00:00Z',
				summary: { pass: 2, warn: 0, fail: 0, info: 0, total: 2 },
				sections: [
					{
						title: 'S',
						description: '',
						checks: [
							{
								goal: 'Passes',
								verdict: 'PASS',
								detail: '',
								values: { x: 1 },
							},
							{ goal: 'Removed', verdict: 'PASS', detail: '' },
						],
					},
				],
			};
			const after = {
				generated: '2024-01-02T00:00:00Z',
				summary: { pass: 1, warn: 1, fail: 0, info: 0, total: 2 },
				sections: [
					{
						title: 'S',
						description: '',
						checks: [
							{
								goal: 'Passes',
								verdict: 'WARN',
								detail: '',
								values: { x: 2 },
							},
							{ goal: 'Added', verdict: 'WARN', detail: '' },
						],
					},
				],
			};
			const result = diffBaseline('dsp-progress', before, after);
			expect(result.summary.added).toBeGreaterThanOrEqual(1);
			expect(result.summary.removed).toBeGreaterThanOrEqual(1);
			expect(result.summary.changed).toBeGreaterThanOrEqual(1);
			expect(result.summary.regressions).toBeGreaterThanOrEqual(1);
			expect(result.baselineGenerated).toBe('2024-01-01T00:00:00Z');
			expect(result.currentGenerated).toBe('2024-01-02T00:00:00Z');
		});
	});
});
