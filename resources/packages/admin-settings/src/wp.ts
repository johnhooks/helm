/**
 * Re-exports from `@wordpress/components` with narrowed types.
 *
 * The Card family uses a polymorphic `WordPressComponent` type that
 * exceeds TypeScript's union complexity limit (TS2590).  Casting to
 * plain `FC` keeps the runtime behavior identical while staying
 * type-safe for the props we actually use.
 */
import type { FC, PropsWithChildren, HTMLAttributes } from 'react';
import {
	Card as WPCard,
	CardBody as WPCardBody,
	CardHeader as WPCardHeader,
} from '@wordpress/components';

type DivProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export const Card = WPCard as FC<DivProps>;
export const CardBody = WPCardBody as FC<DivProps>;
export const CardHeader = WPCardHeader as FC<DivProps>;

export { Button, Notice, Spinner } from '@wordpress/components';
