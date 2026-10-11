export function formatScanPower(value: number): string {
	return value.toFixed(2).replace(/(\.\d)0$/, '$1');
}
