import { parseArgs } from './cli/parse';
import { list } from './cli/list';
import { report } from './cli/report';
import { compare } from './cli/compare';
import { matrix } from './cli/matrix';
import { analyse } from './cli/analyse';

const parsed = parseArgs();
const command = parsed.positional[0];

switch (command) {
	case 'list':
		list(parsed);
		break;

	case 'report':
		report(parsed);
		break;

	case 'compare':
		compare(parsed);
		break;

	case 'matrix':
		matrix(parsed);
		break;

	case 'analyse':
		analyse();
		break;

	default:
		console.error('Usage: bun wb <command> [options]'); // eslint-disable-line no-console
		console.error(''); // eslint-disable-line no-console
		console.error('Commands:'); // eslint-disable-line no-console
		console.error('  list products [--type=core]   List available products'); // eslint-disable-line no-console
		console.error('  list hulls                    List available hulls'); // eslint-disable-line no-console
		console.error('  report [--core=X ...]         Single loadout report'); // eslint-disable-line no-console
		console.error('  compare [--a.core=X --b.core=Y]  Compare two loadouts'); // eslint-disable-line no-console
		console.error('  matrix --vary=slot[,slot]     Sweep combinations'); // eslint-disable-line no-console
		console.error('  analyse                       Run full analysis battery'); // eslint-disable-line no-console
		console.error(''); // eslint-disable-line no-console
		console.error('Tuning flags: --throttle=1.0 --effort=1.0 --priority=1.0'); // eslint-disable-line no-console
		process.exit(1);
}
