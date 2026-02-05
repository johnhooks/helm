import { useState, useCallback } from "react";
import type { StarSystem } from "../types";

export interface UseStarHoverResult {
  hoveredSystem: StarSystem | null;
  handleHover: (system: StarSystem | null) => void;
  isHovered: (systemId: string) => boolean;
}

/**
 * Hook for managing star system hover state
 */
export function useStarHover(): UseStarHoverResult {
  const [hoveredSystem, setHoveredSystem] = useState<StarSystem | null>(null);

  const handleHover = useCallback((system: StarSystem | null) => {
    setHoveredSystem(system);
  }, []);

  const isHovered = useCallback(
    (systemId: string) => {
      return hoveredSystem?.id === systemId;
    },
    [hoveredSystem]
  );

  return {
    hoveredSystem,
    handleHover,
    isHovered,
  };
}
