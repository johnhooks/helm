import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { Quaternion, Vector3 } from "three";
import type { Position3D } from "../../types";

export interface MeasuringPivotProps {
  /**
   * Target position to align the measuring plane with
   */
  alignTarget: Position3D | null;
  /**
   * Animation speed (0-1, higher = faster)
   */
  animationSpeed?: number;
  /**
   * Children to rotate (the measuring rings)
   */
  children: React.ReactNode;
}

// Identity quaternion (no rotation)
const IDENTITY = new Quaternion();

export function MeasuringPivot({
  alignTarget,
  animationSpeed = 0.08,
  children,
}: MeasuringPivotProps) {
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

    const starPos = new Vector3(
      alignTarget.x,
      alignTarget.y,
      alignTarget.z
    );

    // Skip if star is at origin
    if (starPos.length() < 0.001) {
      targetQuaternion.current.copy(IDENTITY);
      return;
    }

    // We want to rotate the XZ plane (rings) so it contains the star position.
    // The XZ plane normal is (0, 1, 0).
    // We need to find a new plane that:
    //   1. Contains the origin
    //   2. Contains the star position
    //   3. Is "closest" to the original XZ plane
    //
    // The new plane's normal should be perpendicular to the star position
    // and rotated minimally from (0, 1, 0).
    //
    // We can find this by:
    //   1. Project the star onto XZ plane to get horizontal direction
    //   2. Rotate around that horizontal axis to tilt the plane up/down

    // Horizontal direction to the star (ignore Y)
    const horizontalDir = new Vector3(alignTarget.x, 0, alignTarget.z).normalize();

    // If star is directly above/below origin, no rotation needed for rings
    if (horizontalDir.length() < 0.001) {
      targetQuaternion.current.copy(IDENTITY);
      return;
    }

    // Axis to rotate around (perpendicular to horizontal direction, in XZ plane)
    const rotationAxis = new Vector3(-horizontalDir.z, 0, horizontalDir.x).normalize();

    // Angle to rotate: we want the plane to pass through the star
    // The angle is based on the star's elevation
    const horizontalDist = Math.sqrt(alignTarget.x ** 2 + alignTarget.z ** 2);
    const angle = Math.atan2(alignTarget.y, horizontalDist);

    // Create rotation quaternion
    targetQuaternion.current.setFromAxisAngle(rotationAxis, angle);
  }, [alignTarget]);

  // Animate rotation each frame
  useFrame(() => {
    if (!groupRef.current) {
      return;
    }

    // Slerp toward target
    currentQuaternion.current.slerp(targetQuaternion.current, animationSpeed);

    // Apply to group
    groupRef.current.quaternion.copy(currentQuaternion.current);
  });

  return <group ref={groupRef}>{children}</group>;
}
