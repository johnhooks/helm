import { useEffect, useState } from 'react';
import { Fill, Slot } from '@wordpress/components';
import { assert, ErrorCode } from '@helm/errors';
import type { DraftAction, ShipAction } from '@helm/actions';
import type { ShipActionRenderProps } from './types';

const SLOT_PREFIX = 'Helm.ShipAction';

function getShipActionSlotName( type: string ) {
	return `${ SLOT_PREFIX }.${ type }`;
}

type ShipActionSlotProps = ShipActionRenderProps & {
	type: string;
};

type ShipActionSlotGuardProps = {
	type: string;
	fills: React.ReactNode;
};

function ShipActionSlotGuard( { type, fills }: ShipActionSlotGuardProps ) {
	const hasFills = Array.isArray( fills ) ? fills.length > 0 : Boolean( fills );
	const [ shouldThrow, setShouldThrow ] = useState( false );

	useEffect( () => {
		if ( ! hasFills ) {
			setShouldThrow( true );
		}
	}, [ hasFills ] );

	if ( hasFills ) {
		return <>{ fills }</>;
	}

	if ( shouldThrow ) {
		assert(
			undefined,
			ErrorCode.ActionsMissingFill,
			`Missing ShipActionFill for type: ${ type }`
		);
	}

	return <></>;
}

export function ShipActionSlot( { type, action, draft }: ShipActionSlotProps ) {
	return (
		<Slot
			name={ getShipActionSlotName( type ) }
			fillProps={ { action, draft } }
		>
			{ ( fills ) => <ShipActionSlotGuard type={ type } fills={ fills } /> }
		</Slot>
	);
}

type ShipActionFillProps = {
	type: string;
	render: ( props: ShipActionRenderProps ) => JSX.Element;
};

export function ShipActionFill( { type, render }: ShipActionFillProps ) {
	return (
		<Fill name={ getShipActionSlotName( type ) }>
			{ ( props: ShipActionRenderProps ) => render( props ) }
		</Fill>
	);
}

export type { DraftAction, ShipAction };
