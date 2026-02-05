import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { Quaternion, Vector3 } from "three";
import type { Position3D } from "../../types";

export interface StarMapPivotProps {
  /** Target position to align with +X axis on XZ plane */
  alignTarget: Position3D | null;
  /** Animation speed (0-1, higher = faster) */
  animationSpeed?: number;
  /** Children to rotate */
  children: React.ReactNode;
}

// Target direction: +X axis at Y=0
const TARGET_DIRECTION = new Vector3(1, 0, 0);

// Identity quaternion (no rotation)
const IDENTITY = new Quaternion();

export function StarMapPivot({
  alignTarget,
  animationSpeed = 0.08,
  children,
}: StarMapPivotProps) {
  const groupRef = useRef<Group>(null);
  const currentQuaternion = useRef(new Quaternion());
  const targetQuaternion = useRef(new Quaternion());

  // Calculate target rotation when alignTarget changes
  useEffect(() => {
    if (!alignTarget) {
      // No target - return to identity (no rotation)
      targetQuaternion.current.copy(IDENTITY);
      return;
    }

    // Direction from origin to target star
    const starDir = new Vector3(
      alignTarget.x,
      alignTarget.y,
      alignTarget.z
    ).normalize();

    // Skip if star is at origin
    if (starDir.length() < 0.001) {
      targetQuaternion.current.copy(IDENTITY);
      return;
    }

    // Calculate rotation that aligns star direction with +X axis
    // This rotation, when applied to the group, will move the star
    // to lie along the +X axis at Y=0
    targetQuaternion.current.setFromUnitVectors(starDir, TARGET_DIRECTION);
  }, [alignTarget]);

  // Animate rotation each frame
  useFrame(() => {
    if (!groupRef.current) return;

    // Slerp toward target
    currentQuaternion.current.slerp(targetQuaternion.current, animationSpeed);

    // Apply to group
    groupRef.current.quaternion.copy(currentQuaternion.current);
  });

  return <group ref={groupRef}>{children}</group>;
}
