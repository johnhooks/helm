import { useState, useCallback, type ReactElement } from 'react';
import { LcarsModal } from '@helm/ui';
import { formatError } from '@helm/core';

export function useErrorModal(): [ ReactElement | null, ( error: unknown ) => void ] {
	const [ formatted, setFormatted ] = useState< { detail: string; causes: string[] } | null >( null );

	const openErrorModal = useCallback( ( error: unknown ) => setFormatted( formatError( error ) ), [] );
	const close = useCallback( () => setFormatted( null ), [] );

	const modal = formatted ? (
		<LcarsModal
			title="Error"
			onRequestClose={ close }
			tone="danger"
			size="small"
		>
			<p>{ formatted.detail }</p>
			{ formatted.causes.length > 0 && (
				<ul>
					{ formatted.causes.map( ( cause, i ) => (
						<li key={ i }>{ cause }</li>
					) ) }
				</ul>
			) }
		</LcarsModal>
	) : null;

	return [ modal, openErrorModal ];
}
