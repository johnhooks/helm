import { useState, useCallback } from 'react';
import type { StarNode } from '@helm/types';

export interface UseStarHoverResult {
	hoveredStar: StarNode | null;
	handleHover: (star: StarNode | null) => void;
	isHovered: (starId: number) => boolean;
}

/**
 * Hook for managing star hover state
 */
export function useStarHover(): UseStarHoverResult {
	const [hoveredStar, setHoveredStar] = useState<StarNode | null>(null);

	const handleHover = useCallback((star: StarNode | null) => {
		setHoveredStar(star);
	}, []);

	const isHovered = useCallback(
		(starId: number) => {
			return hoveredStar?.id === starId;
		},
		[hoveredStar]
	);

	return {
		hoveredStar,
		handleHover,
		isHovered,
	};
}
