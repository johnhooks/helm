import { useEffect, useState, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type { Route, Position3D, RouteOverlayType } from '../../types';
import { ROUTE_LINE_WIDTH, ROUTE_LINE_WIDTH_ACTIVE } from '../../constants';
import { getRouteColor } from '../../utils/colors';
import { toVector3 } from '../../utils/coordinates';

const ROUTE_LINE_OPACITY = 0.32;
const ROUTE_LINE_OPACITY_ACTIVE = 0.9;
const ROUTE_LINE_OPACITY_PULSE_MIN = 0.45;
const ROUTE_LINE_OPACITY_PULSE_MAX = 0.95;

interface RouteLineHandle {
	material?: {
		opacity?: number;
		linewidth?: number;
	};
}

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
	const lineRef = useRef<RouteLineHandle | null>(null);
	const invalidate = useThree((state) => state.invalidate);

	const points = useMemo(() => {
		return [toVector3(from), toVector3(to)];
	}, [from, to]);

	const routeType =
		'type' in route ? (route.type as RouteOverlayType) : undefined;
	const color = useMemo(() => {
		return getRouteColor(route.status, route.active || selected, routeType);
	}, [route.status, route.active, routeType, selected]);

	const active = route.active || selected || hovered;
	const pulsing = 'pulse' in route && route.pulse === true;
	const lineWidth =
		selected || hovered ? ROUTE_LINE_WIDTH_ACTIVE : ROUTE_LINE_WIDTH;
	const opacity = active ? ROUTE_LINE_OPACITY_ACTIVE : ROUTE_LINE_OPACITY;

	useEffect(() => {
		if (pulsing) {
			invalidate();
		}
	}, [invalidate, pulsing]);

	useFrame((state) => {
		if (!pulsing || !lineRef.current?.material) {
			return;
		}

		const pulse = (Math.sin(state.clock.elapsedTime * 4) + 1) / 2;
		lineRef.current.material.opacity =
			ROUTE_LINE_OPACITY_PULSE_MIN +
			(ROUTE_LINE_OPACITY_PULSE_MAX - ROUTE_LINE_OPACITY_PULSE_MIN) *
				pulse;
		lineRef.current.material.linewidth =
			ROUTE_LINE_WIDTH +
			(ROUTE_LINE_WIDTH_ACTIVE - ROUTE_LINE_WIDTH) * pulse;
		invalidate();
	});

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
			ref={(instance) => {
				lineRef.current = instance as RouteLineHandle | null;
			}}
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
