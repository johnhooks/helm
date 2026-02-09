import { useRef, useMemo, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { InstancedMesh } from "three";
import { Object3D, Raycaster, Vector2 } from "three";
import { Html, Billboard, Ring } from "@react-three/drei";
import type { StarNode } from "@helm/types";
import { STAR_BASE_SIZE } from "../../constants";
import { getStarSystemColor, lcarsColors } from "../../utils/colors";

export interface StarInstancesProps {
  stars: StarNode[];
  selectedStarId?: number | null;
  connectedNodeIds: Set<number>;
  currentNodeId?: number | null;
  visitedNodeIds?: Set<number>;
  reachableNodeIds?: Set<number>;
  onStarSelect?: (star: StarNode) => void;
  onStarHover?: (star: StarNode | null) => void;
}

export function StarInstances({
  stars,
  selectedStarId,
  connectedNodeIds,
  reachableNodeIds,
  onStarSelect,
  onStarHover,
}: StarInstancesProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const { camera, gl } = useThree();

  // Track hovered instance
  const hoveredRef = useRef<number | null>(null);
  const hoveredStarRef = useRef<StarNode | null>(null);

  // Raycaster for mouse interaction
  const raycaster = useMemo(() => new Raycaster(), []);
  const mouse = useMemo(() => new Vector2(), []);

  // Build index lookup
  const starByIndex = useMemo(() => {
    const map = new Map<number, StarNode>();
    stars.forEach((s, i) => map.set(i, s));
    return map;
  }, [stars]);

  // Calculate scales for each star based on stellar radius and connectivity
  const getScale = useCallback(
    (star: StarNode) => {
      const isConnected = connectedNodeIds.has(star.node_id);
      const isReachable = reachableNodeIds ? reachableNodeIds.has(star.node_id) : true;

      // Stellar radius -> visual scale via log curve (solar radii, clamped 0.1-20)
      const r = Math.max(0.1, Math.min(star.radius ?? 1, 20));
      const sizeScale = 0.3 + 0.6 * (Math.log10(r * 10) / Math.log10(200));

      if (isConnected) {
        return sizeScale;
      }
      if (isReachable) {
        return sizeScale * 0.5;
      }
      return sizeScale * 0.2;
    },
    [connectedNodeIds, reachableNodeIds]
  );

  // Initialize and update instance matrices
  useEffect(() => {
    if (!meshRef.current) {
      return;
    }

    const tempObj = new Object3D();

    stars.forEach((star, i) => {
      const scale = getScale(star);

      tempObj.position.set(star.x, star.y, star.z);
      tempObj.scale.setScalar(scale);
      tempObj.updateMatrix();

      meshRef.current!.setMatrixAt(i, tempObj.matrix);
      meshRef.current!.setColorAt(i, getStarSystemColor(star.spectral_class));
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [stars, getScale]);

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
          const star = starByIndex.get(instanceId) || null;
          hoveredStarRef.current = star;
          onStarHover?.(star);
          gl.domElement.style.cursor = "pointer";
        }
      } else if (hoveredRef.current !== null) {
        hoveredRef.current = null;
        hoveredStarRef.current = null;
        onStarHover?.(null);
        gl.domElement.style.cursor = "auto";
      }
    },
    [camera, gl, mouse, raycaster, starByIndex, onStarHover]
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
        const star = starByIndex.get(intersects[0].instanceId);
        if (star) {
          onStarSelect?.(star);
        }
      }
    },
    [camera, gl, mouse, raycaster, starByIndex, onStarSelect]
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
      const star = starByIndex.get(hoveredRef.current);
      if (star) {
        const baseScale = getScale(star);
        tempObj.position.set(star.x, star.y, star.z);
        tempObj.scale.setScalar(baseScale * 1.5);
        tempObj.updateMatrix();
        meshRef.current.setMatrixAt(hoveredRef.current, tempObj.matrix);
        meshRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  });

  // Get selected and hovered stars for overlay
  const selectedStar = selectedStarId !== null && selectedStarId !== undefined
    ? stars.find((s) => s.id === selectedStarId)
    : null;

  const hoveredStar = hoveredStarRef.current;

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, stars.length]}
      >
        <sphereGeometry args={[STAR_BASE_SIZE, 16, 16]} />
        <meshBasicMaterial />
      </instancedMesh>

      {/* Selection ring - billboard that always faces camera */}
      {selectedStar && (() => {
        const starScale = getScale(selectedStar);
        const starRadius = STAR_BASE_SIZE * starScale;
        const ringPadding = starRadius * 0.8 + 0.1; // Proportional + minimum padding
        const ringThickness = 0.05; // Fixed thickness
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
                color={lcarsColors.accent}
                transparent
                opacity={0.9}
              />
            </Ring>
          </Billboard>
        );
      })()}

      {/* Label for selected star - fixed screen size, anchored to star position */}
      {selectedStar && (
        <Html
          position={[
            selectedStar.x,
            selectedStar.y,
            selectedStar.z,
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
            {selectedStar.title}
          </div>
        </Html>
      )}

      {/* Label for hovered star (if different from selected) */}
      {hoveredStar && hoveredStar.id !== selectedStarId && (
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
    </>
  );
}
