export interface TimedResponse {
	status: number;
	ttfb: number;
	total: number;
	size: number;
	body: unknown;
}

export async function apiGet(
	url: string,
	auth: string
): Promise<TimedResponse> {
	const credentials = btoa(`admin:${auth}`);

	const start = performance.now();

	const res = await fetch(url, {
		headers: { Authorization: `Basic ${credentials}` },
	});

	const ttfb = performance.now() - start;

	const text = await res.text();
	const total = performance.now() - start;

	const size = new TextEncoder().encode(text).byteLength;

	let body: unknown;
	try {
		body = JSON.parse(text);
	} catch {
		body = text;
	}

	return { status: res.status, ttfb, total, size, body };
}
