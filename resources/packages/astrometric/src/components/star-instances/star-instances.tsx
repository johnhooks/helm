import { useRef, useMemo, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { InstancedMesh } from "three";
import { Object3D, Raycaster, Vector2 } from "three";
import { Html, Billboard, Ring } from "@react-three/drei";
import type { StarSystem } from "../../types";
import { STAR_BASE_SIZE } from "../../constants";
import { getStarSystemColor, lcarsColors } from "../../utils/colors";

export interface StarInstancesProps {
  systems: StarSystem[];
  selectedSystemId?: string | null;
  connectedSystemIds: Set<string>;
  onSystemSelect?: (system: StarSystem) => void;
  onSystemHover?: (system: StarSystem | null) => void;
}

export function StarInstances({
  systems,
  selectedSystemId,
  connectedSystemIds,
  onSystemSelect,
  onSystemHover,
}: StarInstancesProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const { camera, gl } = useThree();

  // Track hovered instance
  const hoveredRef = useRef<number | null>(null);
  const hoveredSystemRef = useRef<StarSystem | null>(null);

  // Raycaster for mouse interaction
  const raycaster = useMemo(() => new Raycaster(), []);
  const mouse = useMemo(() => new Vector2(), []);

  // Build index lookup
  const systemByIndex = useMemo(() => {
    const map = new Map<number, StarSystem>();
    systems.forEach((s, i) => map.set(i, s));
    return map;
  }, [systems]);

  // Calculate scales for each star based on stellar radius and connectivity
  const getScale = useCallback(
    (system: StarSystem) => {
      const isConnected = connectedSystemIds.has(system.id);
      const isReachable = system.reachable !== false;

      // Stellar radius → visual scale via log curve (solar radii, clamped 0.1–20)
      const r = Math.max(0.1, Math.min(system.radius ?? 1, 20));
      const sizeScale = 0.3 + 0.6 * (Math.log10(r * 10) / Math.log10(200));

      if (isConnected) {
        return sizeScale;
      }
      if (isReachable) {
        return sizeScale * 0.5;
      }
      return sizeScale * 0.2;
    },
    [connectedSystemIds]
  );

  // Initialize and update instance matrices
  useEffect(() => {
    if (!meshRef.current) {
      return;
    }

    const tempObj = new Object3D();

    systems.forEach((system, i) => {
      const scale = getScale(system);

      tempObj.position.set(
        system.position.x,
        system.position.y,
        system.position.z
      );
      tempObj.scale.setScalar(scale);
      tempObj.updateMatrix();

      meshRef.current!.setMatrixAt(i, tempObj.matrix);
      meshRef.current!.setColorAt(i, getStarSystemColor(system.spectralClass));
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [systems, getScale]);

  // Handle pointer move for hover detection
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!meshRef.current) {
      return;
    }

      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(meshRef.current);

      if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        const instanceId = intersects[0].instanceId;
        if (hoveredRef.current !== instanceId) {
          hoveredRef.current = instanceId;
          const system = systemByIndex.get(instanceId) || null;
          hoveredSystemRef.current = system;
          onSystemHover?.(system);
          gl.domElement.style.cursor = "pointer";
        }
      } else if (hoveredRef.current !== null) {
        hoveredRef.current = null;
        hoveredSystemRef.current = null;
        onSystemHover?.(null);
        gl.domElement.style.cursor = "auto";
      }
    },
    [camera, gl, mouse, raycaster, systemByIndex, onSystemHover]
  );

  // Handle click for selection
  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (!meshRef.current) {
      return;
    }

      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(meshRef.current);

      if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        const system = systemByIndex.get(intersects[0].instanceId);
        if (system) {
          onSystemSelect?.(system);
        }
      }
    },
    [camera, gl, mouse, raycaster, systemByIndex, onSystemSelect]
  );

  // Attach event listeners
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("click", handleClick);

    return () => {
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("click", handleClick);
    };
  }, [gl, handlePointerMove, handleClick]);

  // Animate hovered/selected stars
  useFrame(() => {
    if (!meshRef.current) {
      return;
    }

    const tempObj = new Object3D();

    // Update hovered star scale
    if (hoveredRef.current !== null) {
      const system = systemByIndex.get(hoveredRef.current);
      if (system) {
        const baseScale = getScale(system);
        tempObj.position.set(
          system.position.x,
          system.position.y,
          system.position.z
        );
        tempObj.scale.setScalar(baseScale * 1.5);
        tempObj.updateMatrix();
        meshRef.current.setMatrixAt(hoveredRef.current, tempObj.matrix);
        meshRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  });

  // Get selected and hovered systems for overlay
  const selectedSystem = selectedSystemId
    ? systems.find((s) => s.id === selectedSystemId)
    : null;

  const hoveredSystem = hoveredSystemRef.current;

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, systems.length]}
      >
        <sphereGeometry args={[STAR_BASE_SIZE, 16, 16]} />
        <meshBasicMaterial />
      </instancedMesh>

      {/* Selection ring - billboard that always faces camera */}
      {selectedSystem && (() => {
        const starScale = getScale(selectedSystem);
        const starRadius = STAR_BASE_SIZE * starScale;
        const ringPadding = starRadius * 0.8 + 0.1; // Proportional + minimum padding
        const ringThickness = 0.05; // Fixed thickness
        const innerRadius = starRadius + ringPadding;
        const outerRadius = innerRadius + ringThickness;

        return (
          <Billboard
            position={[
              selectedSystem.position.x,
              selectedSystem.position.y,
              selectedSystem.position.z,
            ]}
          >
            <Ring args={[innerRadius, outerRadius, 64]}>
              <meshBasicMaterial
                color={lcarsColors.accent}
                transparent
                opacity={0.9}
              />
            </Ring>
          </Billboard>
        );
      })()}

      {/* Label for selected star - fixed screen size, anchored to star position */}
      {selectedSystem && (
        <Html
          position={[
            selectedSystem.position.x,
            selectedSystem.position.y,
            selectedSystem.position.z,
          ]}
          style={{ pointerEvents: "none", userSelect: "none" }}
          center={false}
        >
          <div
            style={{
              color: "#f2b654",
              fontSize: "12px",
              fontFamily: "Antonio, sans-serif",
              whiteSpace: "nowrap",
              marginLeft: "24px",
              textShadow: "0 0 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)",
            }}
          >
            {selectedSystem.name}
          </div>
        </Html>
      )}

      {/* Label for hovered star (if different from selected) */}
      {hoveredSystem && hoveredSystem.id !== selectedSystemId && (
        <Html
          position={[
            hoveredSystem.position.x,
            hoveredSystem.position.y + STAR_BASE_SIZE * 3,
            hoveredSystem.position.z,
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
            {hoveredSystem.name}
          </div>
        </Html>
      )}
    </>
  );
}
