import { useState, useCallback } from "react";
import type { StarNode } from "@helm/types";
import type { StarSelectEvent } from "../types";
import { distanceFromOrigin } from "../utils/coordinates";

export interface UseStarSelectionResult {
  selectedStar: StarNode | null;
  selectedStarId: number | null;
  handleSelect: (star: StarNode) => void;
  clearSelection: () => void;
  isSelected: (starId: number) => boolean;
}

/**
 * Hook for managing star selection state
 */
export function useStarSelection(
  onSelect?: (event: StarSelectEvent | null) => void
): UseStarSelectionResult {
  const [selectedStar, setSelectedStar] = useState<StarNode | null>(null);

  const handleSelect = useCallback(
    (star: StarNode) => {
      if (selectedStar?.id === star.id) {
        // Deselect if clicking same star
        setSelectedStar(null);
        onSelect?.(null);
      } else {
        // Select new star
        setSelectedStar(star);
        onSelect?.({
          star,
          distance: distanceFromOrigin({ x: star.x, y: star.y, z: star.z }),
        });
      }
    },
    [selectedStar, onSelect]
  );

  const clearSelection = useCallback(() => {
    setSelectedStar(null);
    onSelect?.(null);
  }, [onSelect]);

  const isSelected = useCallback(
    (starId: number) => {
      return selectedStar?.id === starId;
    },
    [selectedStar]
  );

  return {
    selectedStar,
    selectedStarId: selectedStar?.id ?? null,
    handleSelect,
    clearSelection,
    isSelected,
  };
}
