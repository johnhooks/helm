import { lando } from './lib/lando';
import { ok, fail, die } from './lib/output';

interface StatusEntry {
	label: string;
	value: string;
}

interface StatusOutput {
	origin: StatusEntry;
	stars_seeded: StatusEntry;
	[key: string]: StatusEntry;
}

export async function checkReadiness(): Promise<void> {
	let status: StatusOutput;
	try {
		const raw = await lando('helm', 'status', '--format=json');
		status = JSON.parse(raw) as StatusOutput;
	} catch (err) {
		die(
			`Could not read helm status. Is Lando running?\n  ${(err as Error).message}`
		);
	}

	let ready = true;

	if (status.origin.value !== 'Initialized') {
		fail('Origin not initialized');
		console.log('    Fix: lando wp helm origin init'); // eslint-disable-line no-console
		ready = false;
	} else {
		ok('Origin initialized');
	}

	if (status.stars_seeded.value !== 'Yes') {
		fail('Stars not seeded');
		console.log('    Fix: lando wp helm star seed'); // eslint-disable-line no-console
		ready = false;
	} else {
		ok('Stars seeded');
	}

	if (!ready) {
		die('Environment not ready. Fix the issues above and try again.');
	}
}
