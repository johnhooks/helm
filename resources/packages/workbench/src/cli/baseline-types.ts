export const BASELINE_COMMANDS = [
	'analyse',
	'dsp-progress',
	'balance',
	'detection',
] as const;
export type BaselineCommand = (typeof BASELINE_COMMANDS)[number];

export interface DiffEntry {
	path: string;
	type: 'added' | 'removed' | 'changed';
	field?: string;
	before?: unknown;
	after?: unknown;
	delta?: number;
	regression?: boolean;
	improvement?: boolean;
}

export interface DiffResult {
	command: BaselineCommand;
	baselineGenerated: string;
	currentGenerated: string;
	summary: {
		added: number;
		removed: number;
		changed: number;
		regressions: number;
		improvements: number;
	};
	entries: DiffEntry[];
}
