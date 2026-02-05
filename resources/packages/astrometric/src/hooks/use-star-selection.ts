import { useState, useCallback } from "react";
import type { StarSystem, StarSelectEvent } from "../types";
import { distanceFromOrigin } from "../utils/coordinates";

export interface UseStarSelectionResult {
  selectedSystem: StarSystem | null;
  selectedSystemId: string | null;
  handleSelect: (system: StarSystem) => void;
  clearSelection: () => void;
  isSelected: (systemId: string) => boolean;
}

/**
 * Hook for managing star system selection state
 */
export function useStarSelection(
  onSelect?: (event: StarSelectEvent | null) => void
): UseStarSelectionResult {
  const [selectedSystem, setSelectedSystem] = useState<StarSystem | null>(null);

  const handleSelect = useCallback(
    (system: StarSystem) => {
      if (selectedSystem?.id === system.id) {
        // Deselect if clicking same system
        setSelectedSystem(null);
        onSelect?.(null);
      } else {
        // Select new system
        setSelectedSystem(system);
        onSelect?.({
          system,
          distance: distanceFromOrigin(system.position),
        });
      }
    },
    [selectedSystem, onSelect]
  );

  const clearSelection = useCallback(() => {
    setSelectedSystem(null);
    onSelect?.(null);
  }, [onSelect]);

  const isSelected = useCallback(
    (systemId: string) => {
      return selectedSystem?.id === systemId;
    },
    [selectedSystem]
  );

  return {
    selectedSystem,
    selectedSystemId: selectedSystem?.id ?? null,
    handleSelect,
    clearSelection,
    isSelected,
  };
}
