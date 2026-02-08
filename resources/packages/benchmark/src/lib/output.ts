/* eslint-disable no-console */
const isTTY = process.stderr.isTTY ?? false;

const RESET = isTTY ? '\x1b[0m' : '';
const BOLD = isTTY ? '\x1b[1m' : '';
const DIM = isTTY ? '\x1b[2m' : '';
const GREEN = isTTY ? '\x1b[32m' : '';
const YELLOW = isTTY ? '\x1b[33m' : '';
const RED = isTTY ? '\x1b[31m' : '';
const CYAN = isTTY ? '\x1b[36m' : '';

export function info(msg: string): void {
	console.error(`${CYAN}${msg}${RESET}`);
}

export function ok(msg: string): void {
	console.error(`${GREEN}  ✓ ${msg}${RESET}`);
}

export function warn(msg: string): void {
	console.error(`${YELLOW}  ⚠ ${msg}${RESET}`);
}

export function fail(msg: string): void {
	console.error(`${RED}  ✗ ${msg}${RESET}`);
}

export function die(msg: string): never {
	fail(msg);
	process.exit(1);
}

export function header(title: string): void {
	console.error(`\n${BOLD}${title}${RESET}`);
	console.error(`${DIM}${'─'.repeat(title.length)}${RESET}`);
}

export function result(msg: string): void {
	console.error(`  ${msg}`);
}
