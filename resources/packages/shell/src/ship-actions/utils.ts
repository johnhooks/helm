export function formatTime( iso: string ): string {
	const date = new Date( iso );
	return date.toLocaleTimeString( [], { hour: '2-digit', minute: '2-digit' } );
}

export function getRemainingSeconds( deferredUntil: string | null ): number {
	if ( ! deferredUntil ) {
		return 0;
	}
	const target = new Date( deferredUntil ).getTime();
	return Math.max( 0, Math.floor( ( target - Date.now() ) / 1000 ) );
}

export function getActionTitle( titles: Record< string, string >, fallback: string, type: string, targetName?: string ): string {
	const baseTitle = titles[ type ] ?? fallback;
	return targetName ? `${ baseTitle } — ${ targetName }` : baseTitle;
}
