import { lando } from './lando';
import { ok, warn } from './output';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export const ADMIN_USER = '1';

const PASSWORD_FILE = new URL(
	'../../../../../tmp/benchmark_app_password',
	import.meta.url
).pathname;

let _apiBase: string | null = null;

/**
 * Resolve the REST API base URL from WordPress.
 *
 * Handles both pretty permalinks (/wp-json/) and plain (?rest_route=/).
 */
export async function resolveApiBase(): Promise<string> {
	if (_apiBase) {
		return _apiBase;
	}

	const restUrl = await lando('eval', "echo rest_url('helm/v1');");

	_apiBase = restUrl.replace(/\/$/, '');
	ok(`API base: ${_apiBase}`);
	return _apiBase;
}

async function validatePassword(
	password: string,
	apiBase: string
): Promise<boolean> {
	try {
		const credentials = btoa(`admin:${password}`);
		const sep = apiBase.includes('?') ? '&' : '?';
		const res = await fetch(`${apiBase}/nodes${sep}per_page=1`, {
			headers: { Authorization: `Basic ${credentials}` },
		});
		return res.status === 200;
	} catch {
		return false;
	}
}

export async function ensureAppPassword(apiBase: string): Promise<string> {
	const file = Bun.file(PASSWORD_FILE);

	if (await file.exists()) {
		const cached = (await file.text()).trim();
		if (cached && (await validatePassword(cached, apiBase))) {
			ok('App password valid (cached)');
			return cached;
		}
		warn('Cached app password stale, creating new one');
	}

	const password = await lando(
		'user',
		'application-password',
		'create',
		ADMIN_USER,
		'benchmark',
		'--porcelain'
	);

	await Bun.write(PASSWORD_FILE, password);
	ok('App password created');

	return password;
}
