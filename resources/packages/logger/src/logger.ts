export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
	time: string;
	level: LogLevel;
	message: string;
	data?: unknown;
}

const LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

const CONSOLE_METHOD: Record<LogLevel, 'log' | 'info' | 'warn' | 'error'> = {
	debug: 'log',
	info: 'info',
	warn: 'warn',
	error: 'error',
};

const MAX_ENTRIES = 1000;
const entries: LogEntry[] = [];

function isDebug(): boolean {
	try {
		return !!window.helm?.settings?.debug;
	} catch {
		return false;
	}
}

function emit(level: LogLevel, message: string, data?: unknown): void {
	if (entries.length >= MAX_ENTRIES) {
		entries.shift();
	}
	entries.push({
		time: new Date().toISOString(),
		level,
		message,
		data,
	});

	if (isDebug() && LEVELS[level] >= LEVELS[consoleLevel]) {
		const method = CONSOLE_METHOD[level];
		if (data !== undefined) {
			// eslint-disable-next-line no-console
			console[method](`[helm] ${message}`, data);
		} else {
			// eslint-disable-next-line no-console
			console[method](`[helm] ${message}`);
		}
	}
}

/**
 * Minimum level for console output. Entries are always collected regardless.
 */
let consoleLevel: LogLevel = 'debug';

export function setLevel(level: LogLevel): void {
	consoleLevel = level;
}

export const log = {
	debug: (message: string, data?: unknown) => emit('debug', message, data),
	info: (message: string, data?: unknown) => emit('info', message, data),
	warn: (message: string, data?: unknown) => emit('warn', message, data),
	error: (message: string, data?: unknown) => emit('error', message, data),
};

export function getEntries(): readonly LogEntry[] {
	return entries;
}

export function clearEntries(): void {
	entries.length = 0;
}
