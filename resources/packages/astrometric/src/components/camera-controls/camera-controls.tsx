import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { ComponentRef } from "react";
import {
  DEFAULT_CAMERA_DISTANCE,
  DEFAULT_MAX_DISTANCE,
  DEFAULT_MIN_DISTANCE,
  ORBIT_DAMPING_FACTOR,
  POLAR_ANGLE_MAX,
  POLAR_ANGLE_MIN,
} from "../../constants";
import type { CameraInfo } from "../../types";

export interface CameraControlsProps {
  /**
   * Enable/disable controls
   */
  enabled?: boolean;
  /**
   * Initial camera distance
   */
  initialDistance?: number;
  /**
   * Minimum zoom distance
   */
  minDistance?: number;
  /**
   * Maximum zoom distance
   */
  maxDistance?: number;
  /**
   * Callback when camera moves
   */
  onCameraChange?: (info: CameraInfo) => void;
  /**
   * Whether using orthographic camera
   */
  isOrthographic?: boolean;
}

export function CameraControls({
  enabled = true,
  initialDistance = DEFAULT_CAMERA_DISTANCE,
  minDistance = DEFAULT_MIN_DISTANCE,
  maxDistance = DEFAULT_MAX_DISTANCE,
  onCameraChange,
  isOrthographic = false,
}: CameraControlsProps) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();

  // Set initial camera position
  useEffect(() => {
    camera.position.set(0, initialDistance * 0.5, initialDistance * 0.866);
    camera.lookAt(0, 0, 0);
  }, [camera, initialDistance]);

  // For orthographic cameras, zoom is roughly pixels-per-unit
  // minZoom = zoomed out (see more), maxZoom = zoomed in (see less but bigger)
  const minZoom = isOrthographic ? 5 : undefined;
  const maxZoom = isOrthographic ? 200 : undefined;

  // Handle camera change events
  const handleChange = () => {
    if (!onCameraChange || !controlsRef.current) {
      return;
    }

    const distance = camera.position.length();
    const polarAngle = controlsRef.current.getPolarAngle();
    const azimuthAngle = controlsRef.current.getAzimuthalAngle();

    onCameraChange({
      distance,
      polarAngle,
      azimuthAngle,
    });
  };

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={enabled}
      enablePan={false}
      enableDamping
      dampingFactor={ORBIT_DAMPING_FACTOR}
      minDistance={isOrthographic ? undefined : minDistance}
      maxDistance={isOrthographic ? undefined : maxDistance}
      minZoom={minZoom}
      maxZoom={maxZoom}
      minPolarAngle={POLAR_ANGLE_MIN}
      maxPolarAngle={POLAR_ANGLE_MAX}
      target={[0, 0, 0]}
      onChange={handleChange}
    />
  );
}
