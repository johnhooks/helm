import { parseArgs } from './cli/parse';
import { list } from './cli/list';
import { report } from './cli/report';
import { compare } from './cli/compare';
import { matrix } from './cli/matrix';
import { analyse } from './cli/analyse';
import { dsp } from './cli/dsp';
import { dspProgress } from './cli/dsp-progress';
import { dspTiers } from './cli/dsp-tiers';
import { balance } from './cli/balance';
import { detection } from './cli/detection';
import { ship } from './cli/ship';
import { timeline } from './cli/timeline';
import { action } from './cli/action';
import { scenarioCommand } from './cli/scenario';

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

	case 'dsp':
		dsp();
		break;

	case 'dsp-progress':
		dspProgress();
		break;

	case 'dsp-tiers':
		dspTiers();
		break;

	case 'balance':
		balance(parsed);
		break;

	case 'detection':
		detection();
		break;

	case 'ship':
		ship(parsed);
		break;

	case 'timeline':
		timeline(parsed);
		break;

	case 'action':
		action(parsed);
		break;

	case 'scenario':
		scenarioCommand(parsed);
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
		console.error('  dsp                           DSP detection scenario analysis'); // eslint-disable-line no-console
		console.error('  dsp-progress                  DSP gameplay progress assessment'); // eslint-disable-line no-console
		console.error('  dsp-tiers                     Information tier exploration'); // eslint-disable-line no-console
		console.error('  balance [--vary=core,drive]   All hulls × loadout matrix'); // eslint-disable-line no-console
		console.error('  detection                     Wolf × target detection matrix'); // eslint-disable-line no-console
		console.error('  ship [--hull=X --core=Y ...]  Holodeck ship state snapshot'); // eslint-disable-line no-console
		console.error('  timeline [--file=X]           Ship mutation timeline'); // eslint-disable-line no-console
		console.error('  action --action=jump [...]    Submit action via holodeck Engine'); // eslint-disable-line no-console
		console.error('  scenario <scenario.json>      Run sequential actions via Engine'); // eslint-disable-line no-console
		console.error(''); // eslint-disable-line no-console
		console.error('Tuning flags: --throttle=1.0 --effort=1.0 --priority=1.0'); // eslint-disable-line no-console
		process.exit(1);
}
