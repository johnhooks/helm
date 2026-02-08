export interface Stats {
	min: number;
	avg: number;
	max: number;
	p95: number;
}

export function computeStats(values: number[]): Stats {
	const sorted = [...values].sort((a, b) => a - b);
	const min = sorted[0];
	const max = sorted[sorted.length - 1];
	const avg = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
	const p95Index = Math.ceil(sorted.length * 0.95) - 1;
	const p95 = sorted[Math.min(p95Index, sorted.length - 1)];

	return { min, avg, max, p95 };
}

export function formatMs(n: number): string {
	return `${n.toFixed(1)}ms`;
}

export function formatBytes(n: number): string {
	if (n < 1024) {
		return `${n}B`;
	}
	if (n < 1024 * 1024) {
		return `${(n / 1024).toFixed(1)}KB`;
	}
	return `${(n / (1024 * 1024)).toFixed(1)}MB`;
}
