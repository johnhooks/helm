import type { Analysis } from '../analyse';
import type { DspProgressOutput } from '../dsp-progress';
import type { BalanceOutput } from '../balance';
import type { DetectionOutput } from '../detection';
import type { DiffResult } from '../baseline-types';

export interface ReportContext {
	generated: string;
	analyse: Analysis;
	dspProgress: DspProgressOutput;
	balance: BalanceOutput;
	detection: DetectionOutput;
	diffs: DiffResult[] | null;
}

export interface ReportFile {
	filename: string;
	content: string;
}
