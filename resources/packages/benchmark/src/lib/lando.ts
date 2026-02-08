export async function lando(...args: string[]): Promise<string> {
	const proc = Bun.spawn(['lando', 'wp', ...args], {
		stdout: 'pipe',
		stderr: 'pipe',
	});

	const stdout = await new Response(proc.stdout).text();
	const stderr = await new Response(proc.stderr).text();
	const exitCode = await proc.exited;

	if (exitCode !== 0) {
		throw new Error(
			`lando wp ${args.join(' ')} failed (exit ${exitCode}):\n${stderr || stdout}`
		);
	}

	return stdout.trim();
}
