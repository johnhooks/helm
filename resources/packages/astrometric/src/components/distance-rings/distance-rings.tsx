import { useMemo } from "react";
import { Line, Html } from "@react-three/drei";
import { Vector3 } from "three";
import type { DistanceRing } from "../../types";
import { DEFAULT_DISTANCE_RINGS } from "../../constants";

export interface DistanceRingsProps {
  /**
   * Ring configurations
   */
  rings?: DistanceRing[];
  /**
   * Whether to show distance labels
   */
  showLabels?: boolean;
  /**
   * Number of segments per ring
   */
  segments?: number;
}

// Generate circle points on the XZ plane (horizontal)
function circlePointsXZ(radius: number, segments: number): Vector3[] {
  const points: Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(new Vector3(
      Math.cos(theta) * radius,
      0,
      Math.sin(theta) * radius
    ));
  }
  return points;
}

// Generate circle points on the XY plane (vertical)
function circlePointsXY(radius: number, segments: number): Vector3[] {
  const points: Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(new Vector3(
      Math.cos(theta) * radius,
      Math.sin(theta) * radius,
      0
    ));
  }
  return points;
}

// Major rings (sensor/scan range) - prominent
const MAJOR_HORIZONTAL_COLOR = "#99ccff";
const MAJOR_VERTICAL_COLOR = "#cc99cc";
const MAJOR_LINE_WIDTH = 2;
const MAJOR_LABEL_COLOR = "#99ccff";

// Minor rings (reference markers) - subtle
const MINOR_HORIZONTAL_COLOR = "#4a6680";
const MINOR_LINE_WIDTH = 1;
const MINOR_LABEL_COLOR = "#5a7a94";

export function DistanceRings({
  rings = DEFAULT_DISTANCE_RINGS,
  showLabels = true,
  segments = 64,
}: DistanceRingsProps) {
  // Generate points for each ring
  const ringData = useMemo(() => {
    return rings.map((ring) => ({
      ...ring,
      horizontalPoints: circlePointsXZ(ring.distance, segments),
      verticalPoints: circlePointsXY(ring.distance, segments),
      isMajor: ring.type !== "minor",
    }));
  }, [rings, segments]);

  return (
    <group>
      {ringData.map((ring) => {
        const horizontalColor = ring.isMajor ? MAJOR_HORIZONTAL_COLOR : MINOR_HORIZONTAL_COLOR;
        const lineWidth = ring.isMajor ? MAJOR_LINE_WIDTH : MINOR_LINE_WIDTH;
        const labelColor = ring.isMajor ? MAJOR_LABEL_COLOR : MINOR_LABEL_COLOR;
        const labelSize = ring.isMajor ? "12px" : "10px";

        return (
          <group key={ring.distance}>
            {/* Horizontal ring (XZ plane) - shown for all rings */}
            <Line
              points={ring.horizontalPoints}
              color={horizontalColor}
              lineWidth={lineWidth}
            />

            {/* Vertical ring (XY plane) - only for major rings */}
            {ring.isMajor && (
              <Line
                points={ring.verticalPoints}
                color={MAJOR_VERTICAL_COLOR}
                lineWidth={lineWidth}
              />
            )}

            {/* Distance label */}
            {showLabels && ring.label && (
              <Html
                position={[ring.distance + 0.3, 0, 0]}
                style={{
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                <div
                  style={{
                    color: labelColor,
                    fontSize: labelSize,
                    fontFamily: "Antonio, sans-serif",
                    whiteSpace: "nowrap",
                    opacity: ring.isMajor ? 1 : 0.7,
                  }}
                >
                  {ring.label}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
