import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type {
	Position3D,
	Route,
	RouteEdgeState,
	RouteEdgeType,
} from '../../types';
import { ROUTE_LINE_WIDTH, ROUTE_LINE_WIDTH_ACTIVE } from '../../constants';
import { getRouteEdgeColor } from '../../utils/colors';
import { toVector3 } from '../../utils/coordinates';

const ROUTE_LINE_OPACITY_IDLE = 0.32;
const ROUTE_LINE_OPACITY_PLANNED = 0.32;
const ROUTE_LINE_OPACITY_COMPLETE = 0.18;
const ROUTE_LINE_OPACITY_FAILED = 0.4;
const ROUTE_LINE_OPACITY_SELECTED_BOOST = 0.32;
const ROUTE_LINE_OPACITY_MAX = 0.9;
const ROUTE_LINE_OPACITY_PULSE_MIN = 0.45;
const ROUTE_LINE_OPACITY_PULSE_MAX = 0.95;

interface RouteLineHandle {
	material?: {
		opacity?: number;
		linewidth?: number;
	};
}

interface RouteLineStyle {
	color: string;
	opacity: number;
	lineWidth: number;
	dashed: boolean;
	animated: boolean;
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

function routeOpacity(state: RouteEdgeState): number {
	switch (state) {
		case 'complete':
			return ROUTE_LINE_OPACITY_COMPLETE;
		case 'failed':
			return ROUTE_LINE_OPACITY_FAILED;
		case 'active':
		case 'planned':
			return ROUTE_LINE_OPACITY_PLANNED;
		case 'idle':
		default:
			return ROUTE_LINE_OPACITY_IDLE;
	}
}

function resolveRouteLineStyle(
	route: Route,
	selected: boolean,
	hovered: boolean
): RouteLineStyle {
	const type: RouteEdgeType = route.type ?? 'route';
	const state: RouteEdgeState = route.state ?? 'idle';
	const focused = route.selected === true || selected;
	const animated = state === 'active';

	const baseOpacity = routeOpacity(state);
	const focusedOpacity = focused
		? Math.min(
				baseOpacity + ROUTE_LINE_OPACITY_SELECTED_BOOST,
				ROUTE_LINE_OPACITY_MAX
		  )
		: baseOpacity;
	const hoverOpacity = Math.min(
		Math.max(
			focusedOpacity,
			ROUTE_LINE_OPACITY_PLANNED + ROUTE_LINE_OPACITY_SELECTED_BOOST
		),
		ROUTE_LINE_OPACITY_MAX
	);
	const opacity = hovered ? hoverOpacity : focusedOpacity;

	return {
		color: `#${getRouteEdgeColor(type, state).getHexString()}`,
		opacity,
		lineWidth: animated ? ROUTE_LINE_WIDTH_ACTIVE : ROUTE_LINE_WIDTH,
		dashed: false,
		animated,
	};
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

	const style = useMemo(() => {
		return resolveRouteLineStyle(route, selected, hovered);
	}, [hovered, route, selected]);

	useEffect(() => {
		if (style.animated) {
			invalidate();
		}
	}, [invalidate, style.animated]);

	useFrame((state) => {
		if (!style.animated || !lineRef.current?.material) {
			return;
		}

		const pulse = (Math.sin(state.clock.elapsedTime * 4) + 1) / 2;
		lineRef.current.material.opacity =
			ROUTE_LINE_OPACITY_PULSE_MIN +
			(ROUTE_LINE_OPACITY_PULSE_MAX - ROUTE_LINE_OPACITY_PULSE_MIN) *
				pulse;
		lineRef.current.material.linewidth = style.lineWidth;
		invalidate();
	});

	const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
		event.stopPropagation();
		setHovered(true);
		onHover?.(true);
		document.body.style.cursor = 'pointer';
	};

	const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
		event.stopPropagation();
		setHovered(false);
		onHover?.(false);
		document.body.style.cursor = 'auto';
	};

	const handleClick = (event: ThreeEvent<MouseEvent>) => {
		event.stopPropagation();
		onSelect?.();
	};

	return (
		<Line
			ref={(instance) => {
				lineRef.current = instance as RouteLineHandle | null;
			}}
			points={points}
			color={style.color}
			lineWidth={style.lineWidth}
			transparent
			opacity={style.opacity}
			dashed={style.dashed}
			dashSize={0.3}
			gapSize={0.15}
			onClick={handleClick}
			onPointerOver={handlePointerOver}
			onPointerOut={handlePointerOut}
		/>
	);
}
