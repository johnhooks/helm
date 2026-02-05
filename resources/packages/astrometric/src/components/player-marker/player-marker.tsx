import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { lcarsColors } from "../../utils/colors";

export interface PlayerMarkerProps {
  /** Size of the marker */
  size?: number;
  /** Whether to animate (pulse) */
  animate?: boolean;
}

const DEFAULT_SIZE = 0.1;

export function PlayerMarker({
  size = DEFAULT_SIZE,
  animate = true,
}: PlayerMarkerProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!animate || !meshRef.current) return;

    const time = state.clock.getElapsedTime();
    // Subtle pulse
    const scale = 1 + Math.sin(time * 2) * 0.15;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[size, 32, 32]} />
      <meshBasicMaterial color={lcarsColors.accent} />
    </mesh>
  );
}
