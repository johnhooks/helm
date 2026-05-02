import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef } from 'react';
import type { ComponentRef } from 'react';
import { Vector3 } from 'three';
import {
	DEFAULT_CAMERA_DISTANCE,
	DEFAULT_MAX_DISTANCE,
	DEFAULT_MIN_DISTANCE,
	ORBIT_DAMPING_FACTOR,
	POLAR_ANGLE_MAX,
	POLAR_ANGLE_MIN,
} from '../../constants';
import type { CameraInfo, Position3D } from '../../types';

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
	/**
	 * World-space point the camera orbits around. Defaults to origin.
	 * Changing this after mount translates the camera by the same delta so
	 * the orbital distance and angle are preserved.
	 */
	target?: Position3D;
}

const ORIGIN: Position3D = { x: 0, y: 0, z: 0 };

export function CameraControls({
	enabled = true,
	initialDistance = DEFAULT_CAMERA_DISTANCE,
	minDistance = DEFAULT_MIN_DISTANCE,
	maxDistance = DEFAULT_MAX_DISTANCE,
	onCameraChange,
	isOrthographic = false,
	target = ORIGIN,
}: CameraControlsProps) {
	const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
	const { camera } = useThree();
	const prevTargetRef = useRef<Vector3>(
		new Vector3(target.x, target.y, target.z)
	);

	// Initial camera placement relative to the target.
	useEffect(() => {
		camera.position.set(
			prevTargetRef.current.x,
			prevTargetRef.current.y + initialDistance * 0.5,
			prevTargetRef.current.z + initialDistance * 0.866
		);
		camera.lookAt(prevTargetRef.current);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [camera, initialDistance]);

	// When the target moves, translate the camera by the same delta so the
	// user-chosen orbit angle and zoom are preserved across target changes.
	useEffect(() => {
		const next = new Vector3(target.x, target.y, target.z);
		const delta = next.clone().sub(prevTargetRef.current);
		if (delta.lengthSq() === 0) {
			return;
		}
		camera.position.add(delta);
		prevTargetRef.current.copy(next);
		controlsRef.current?.update();
	}, [target.x, target.y, target.z, camera]);

	// For orthographic cameras, zoom is roughly pixels-per-unit
	// minZoom = zoomed out (see more), maxZoom = zoomed in (see less but bigger)
	const minZoom = isOrthographic ? 5 : undefined;
	const maxZoom = isOrthographic ? 200 : undefined;

	// Handle camera change events
	const handleChange = useCallback(() => {
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
	}, [onCameraChange, camera]);

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
			target={[target.x, target.y, target.z]}
			onChange={handleChange}
		/>
	);
}
