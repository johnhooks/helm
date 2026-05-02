import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { Html } from '@react-three/drei';
import type { StarNode } from '@helm/types';
import { STAR_BASE_SIZE } from '../../constants';
import { getStarSystemColor } from '../../utils/colors';

export interface LocalSystemProps {
	/**
	 * Star data
	 */
	star: StarNode;
	/**
	 * Whether this star is selected
	 */
	selected?: boolean;
	/**
	 * Whether this star has routes connected
	 */
	connected?: boolean;
	/**
	 * Whether this star is within jump range
	 */
	reachable?: boolean;
	/**
	 * Called when star is clicked
	 */
	onSelect?: () => void;
	/**
	 * Called when hover state changes
	 */
	onHover?: (hovering: boolean) => void;
}

export function LocalSystem({
	star,
	selected = false,
	connected = false,
	reachable = true,
	onSelect,
	onHover,
}: LocalSystemProps) {
	const meshRef = useRef<Mesh>(null);
	const [hovered, setHovered] = useState(false);

	const starColor = getStarSystemColor(star.spectral_class);

	// Calculate base scale based on status
	// Selected/connected: full size, reachable: smaller, unreachable: tiny
	const isHighlighted = selected || connected;

	let baseScale: number;
	if (isHighlighted) {
		baseScale = 1;
	} else if (reachable) {
		baseScale = 0.5;
	} else {
		baseScale = 0.2;
	}

	// Handle hover animation
	useFrame(() => {
		if (!meshRef.current) {
			return;
		}

		// Scale up on hover
		const targetScale = hovered ? baseScale * 1.5 : baseScale;
		const currentScale = meshRef.current.scale.x;
		const newScale = currentScale + (targetScale - currentScale) * 0.1;
		meshRef.current.scale.setScalar(newScale);
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
		<group position={[star.x, star.y, star.z]}>
			{/* Star sphere */}
			<mesh
				ref={meshRef}
				onClick={handleClick}
				onPointerOver={handlePointerOver}
				onPointerOut={handlePointerOut}
			>
				<sphereGeometry args={[STAR_BASE_SIZE, 32, 32]} />
				<meshBasicMaterial color={starColor} />
			</mesh>

			{/* Name label on hover/select/connected */}
			{(hovered || selected || connected) && (
				<Html
					position={[0, STAR_BASE_SIZE * 2.5, 0]}
					center
					style={{
						pointerEvents: 'none',
						userSelect: 'none',
					}}
				>
					<div
						style={{
							background: 'rgba(10, 10, 10, 0.9)',
							color: selected ? '#f2b654' : '#f0e6d2',
							padding: '4px 8px',
							borderRadius: '4px',
							fontSize: '12px',
							fontFamily: 'Antonio, sans-serif',
							whiteSpace: 'nowrap',
							border: selected
								? '1px solid #f2b654'
								: '1px solid #2a2a2a',
						}}
					>
						{star.title}
					</div>
				</Html>
			)}
		</group>
	);
}
