import { Html, Billboard, Ring } from "@react-three/drei";
import type { StarNode } from "@helm/types";
import { STAR_BASE_SIZE } from "../../constants";
import { lcarsColors } from "../../utils/colors";

export interface StarOverlaysProps {
  stars: StarNode[];
  selectedStar: StarNode | null;
  hoveredStar: StarNode | null;
  showLabels?: boolean;
  getScale: (star: StarNode) => number;
}

export function StarOverlays({
  stars,
  selectedStar,
  hoveredStar,
  showLabels = false,
  getScale,
}: StarOverlaysProps) {
  return (
    <>
      {/* Selection ring - billboard that always faces camera */}
      {selectedStar && (() => {
        const starScale = getScale(selectedStar);
        const starRadius = STAR_BASE_SIZE * starScale;
        const ringPadding = starRadius * 0.8 + 0.1; // Proportional + minimum padding
        const ringThickness = 0.01; // Thin hairline ring
        const innerRadius = starRadius + ringPadding;
        const outerRadius = innerRadius + ringThickness;

        return (
          <Billboard
            position={[
              selectedStar.x,
              selectedStar.y,
              selectedStar.z,
            ]}
          >
            <Ring args={[innerRadius, outerRadius, 64]}>
              <meshBasicMaterial
                color={lcarsColors.sky}
              />
            </Ring>
          </Billboard>
        );
      })()}

      {/* Label for hovered star (if different from selected) */}
      {hoveredStar && hoveredStar.id !== selectedStar?.id && (
        <Html
          position={[
            hoveredStar.x,
            hoveredStar.y + STAR_BASE_SIZE * 3,
            hoveredStar.z,
          ]}
          center
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div
            style={{
              background: "rgba(10, 10, 10, 0.9)",
              color: "#f0e6d2",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              fontFamily: "Antonio, sans-serif",
              whiteSpace: "nowrap",
              border: "1px solid #2a2a2a",
            }}
          >
            {hoveredStar.title}
          </div>
        </Html>
      )}

      {/* Labels for all stars (when enabled, e.g. in jump-range view) */}
      {showLabels &&
        stars.map((star) => {
          // Skip stars that already have dedicated labels
          if (star.id === selectedStar?.id || star.id === hoveredStar?.id) {
            return null;
          }

          return (
            <Html
              key={star.id}
              position={[star.x, star.y, star.z]}
              style={{ pointerEvents: "none", userSelect: "none" }}
              center={false}
            >
              <div
                style={{
                  color: "#a39a88",
                  fontSize: "11px",
                  fontFamily: "Antonio, sans-serif",
                  whiteSpace: "nowrap",
                  marginLeft: "16px",
                  textShadow:
                    "0 0 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)",
                }}
              >
                {star.title}
              </div>
            </Html>
          );
        })}
    </>
  );
}
