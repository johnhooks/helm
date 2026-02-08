export async function gitSha(): Promise<string> {
	const proc = Bun.spawn(['git', 'rev-parse', '--short', 'HEAD'], {
		stdout: 'pipe',
	});
	return (await new Response(proc.stdout).text()).trim();
}

export async function gitBranch(): Promise<string> {
	const proc = Bun.spawn(['git', 'branch', '--show-current'], {
		stdout: 'pipe',
	});
	return (await new Response(proc.stdout).text()).trim();
}
