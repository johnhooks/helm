import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { DEFAULT_JUMP_BOUNDARY } from "../../constants";
import { lcarsColors } from "../../utils/colors";

export interface JumpBoundaryProps {
  /** Radius in light-years */
  radius?: number;
  /** Whether to animate (slow rotation) */
  animate?: boolean;
}

export function JumpBoundary({
  radius = DEFAULT_JUMP_BOUNDARY,
  animate = true,
}: JumpBoundaryProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!animate || !meshRef.current) return;

    const time = state.clock.getElapsedTime();
    meshRef.current.rotation.y = time * 0.02;
    meshRef.current.rotation.x = time * 0.01;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[radius, 32, 24]} />
      <meshBasicMaterial
        color={lcarsColors.sky}
        wireframe
        transparent
        opacity={0.15}
      />
    </mesh>
  );
}
