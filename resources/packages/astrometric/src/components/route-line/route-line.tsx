import { useState, useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { Route, Position3D } from '../../types';
import { ROUTE_LINE_WIDTH, ROUTE_LINE_WIDTH_ACTIVE } from '../../constants';
import { getRouteColor } from '../../utils/colors';
import { toVector3 } from '../../utils/coordinates';

const ROUTE_LINE_OPACITY = 0.32;
const ROUTE_LINE_OPACITY_ACTIVE = 0.9;

export interface RouteLineProps {
	/**
	 * Route data
	 */
	route: Route;
	/**
	 * Start position
	 */
	from: Position3D;
	/**
	 * End position
	 */
	to: Position3D;
	/**
	 * Whether this route is selected
	 */
	selected?: boolean;
	/**
	 * Called when route is clicked
	 */
	onSelect?: () => void;
	/**
	 * Called when hover state changes
	 */
	onHover?: (hovering: boolean) => void;
}

export function RouteLine({
	route,
	from,
	to,
	selected = false,
	onSelect,
	onHover,
}: RouteLineProps) {
	const [hovered, setHovered] = useState(false);

	const points = useMemo(() => {
		return [toVector3(from), toVector3(to)];
	}, [from, to]);

	const color = useMemo(() => {
		return getRouteColor(route.status, route.active || selected);
	}, [route.status, route.active, selected]);

	const active = route.active || selected || hovered;
	const lineWidth =
		selected || hovered ? ROUTE_LINE_WIDTH_ACTIVE : ROUTE_LINE_WIDTH;
	const opacity = active ? ROUTE_LINE_OPACITY_ACTIVE : ROUTE_LINE_OPACITY;

	const handlePointerOver = () => {
		setHovered(true);
		onHover?.(true);
		document.body.style.cursor = 'pointer';
	};

	const handlePointerOut = () => {
		setHovered(false);
		onHover?.(false);
		document.body.style.cursor = 'auto';
	};

	const handleClick = (e: { stopPropagation: () => void }) => {
		e.stopPropagation();
		onSelect?.();
	};

	return (
		<Line
			points={points}
			color={color}
			lineWidth={lineWidth}
			transparent
			opacity={opacity}
			dashed={route.status === 'blocked'}
			dashSize={0.3}
			gapSize={0.15}
			onClick={handleClick}
			onPointerOver={handlePointerOver}
			onPointerOut={handlePointerOut}
		/>
	);
}
