import { Canvas } from "@react-three/fiber";
import { useMemo, useCallback, useRef } from "react";
import type { StarNode } from "@helm/types";
import type {
  StarFieldProps,
  Route,
  StarSelectEvent,
  RouteSelectEvent,
  HoverState,
  CameraInfo,
  Position3D,
} from "../../types";
import {
  DEFAULT_BACKGROUND_STAR_COUNT,
  DEFAULT_CAMERA_DISTANCE,
  DEFAULT_DISTANCE_RINGS,
  DEFAULT_MAX_DISTANCE,
  DEFAULT_MIN_DISTANCE,
} from "../../constants";
import { lcarsColors, distanceFromOrigin } from "../../utils";
import { CameraControls } from "../camera-controls";
import { BackgroundStars } from "../background-stars";
import { GalacticPlane } from "../galactic-plane";
import { MeasuringPivot } from "../measuring-pivot";
import { StarInstances } from "../star-instances";
import { DistanceRings } from "../distance-rings";
import { RouteLine } from "../route-line";
import "./star-field.css";

export function StarField({
  stars,
  routes = [],
  distanceRings = DEFAULT_DISTANCE_RINGS,
  backgroundStarCount = DEFAULT_BACKGROUND_STAR_COUNT,
  selectedStarId = null,
  selectedRouteId = null,
  currentNodeId,
  visitedNodeIds,
  reachableNodeIds,
  onStarSelect,
  onRouteSelect,
  onHoverChange,
  onCameraChange,
  showBackground = false,
  showDistanceLabels = true,
  showLabels = false,
  enableControls = true,
  initialCameraDistance = DEFAULT_CAMERA_DISTANCE,
  minDistance = DEFAULT_MIN_DISTANCE,
  maxDistance = DEFAULT_MAX_DISTANCE,
  cameraMode = "perspective",
  starScale = 1,
  className = "",
  style,
  "data-testid": testId,
}: StarFieldProps) {
  const hoverRef = useRef<HoverState>({ star: null, route: null });

  // Build star lookup by node_id for routes
  const starsByNodeId = useMemo(() => {
    const map = new Map<number, StarNode>();
    stars.forEach((s) => map.set(s.node_id, s));
    return map;
  }, [stars]);

  // Get selected star's position for camera focus
  const focusTarget: Position3D | null = useMemo(() => {
    if (selectedStarId === null || selectedStarId === undefined) {
      return null;
    }
    const star = stars.find((s) => s.id === selectedStarId);
    return star ? { x: star.x, y: star.y, z: star.z } : null;
  }, [selectedStarId, stars]);

  // Track which node IDs have routes connected
  const connectedNodeIds = useMemo(() => {
    const ids = new Set<number>();
    routes.forEach((route) => {
      ids.add(route.from);
      ids.add(route.to);
    });
    return ids;
  }, [routes]);

  // Handle star selection
  const handleStarClick = useCallback(
    (star: StarNode) => {
      if (!onStarSelect) {
        return;
      }

      if (selectedStarId === star.id) {
        onStarSelect(null);
      } else {
        const event: StarSelectEvent = {
          star,
          distance: distanceFromOrigin({ x: star.x, y: star.y, z: star.z }),
        };
        onStarSelect(event);
      }
    },
    [onStarSelect, selectedStarId]
  );

  // Handle route selection
  const handleRouteClick = useCallback(
    (route: Route) => {
      if (!onRouteSelect) {
        return;
      }

      if (selectedRouteId === route.id) {
        onRouteSelect(null);
      } else {
        const from = starsByNodeId.get(route.from);
        const to = starsByNodeId.get(route.to);
        if (!from || !to) {
          return;
        }

        const event: RouteSelectEvent = {
          route,
          from,
          to,
          distance: distanceFromOrigin({ x: from.x, y: from.y, z: from.z }) +
            distanceFromOrigin({ x: to.x, y: to.y, z: to.z }),
        };
        onRouteSelect(event);
      }
    },
    [onRouteSelect, selectedRouteId, starsByNodeId]
  );

  // Handle hover changes (ref-based to avoid re-renders)
  const handleStarHover = useCallback(
    (star: StarNode | null) => {
      hoverRef.current = { ...hoverRef.current, star };
      onHoverChange?.(hoverRef.current);
    },
    [onHoverChange]
  );

  const handleRouteHover = useCallback(
    (route: Route | null) => {
      hoverRef.current = { ...hoverRef.current, route };
      onHoverChange?.(hoverRef.current);
    },
    [onHoverChange]
  );

  // Handle camera changes
  const handleCameraChange = useCallback(
    (info: CameraInfo) => {
      onCameraChange?.(info);
    },
    [onCameraChange]
  );

  const classNames = ["helm-star-field", className].filter(Boolean).join(" ");

  // Camera configuration based on mode
  const isOrthographic = cameraMode === "orthographic";
  const cameraFov = cameraMode === "narrow" ? 30 : 50;
  // For orthographic, zoom is roughly pixels-per-unit - 25 gives a reasonable starting view
  const orthoZoom = 25;

  return (
    <div className={classNames} style={style} data-testid={testId}>
      {/* Key forces Canvas remount when camera type changes */}
      <Canvas
        key={cameraMode}
        orthographic={isOrthographic}
        camera={
          isOrthographic
            ? { zoom: orthoZoom, near: 0.1, far: 500 }
            : { fov: cameraFov, near: 0.1, far: 500 }
        }
        frameloop="demand"
        gl={{ antialias: true }}
      >
        {/* Background color */}
        <color attach="background" args={[lcarsColors.bg]} />

        {/* Camera controls */}
        <CameraControls
          enabled={enableControls}
          initialDistance={initialCameraDistance}
          minDistance={minDistance}
          maxDistance={maxDistance}
          onCameraChange={handleCameraChange}
          isOrthographic={isOrthographic}
        />

        {/* Galactic plane glow (distant galaxy disk) - hidden when examining a star */}
        {showBackground && !focusTarget && <GalacticPlane />}

        {/* Background stars (galaxy context) - hidden when examining a star */}
        {showBackground && !focusTarget && <BackgroundStars count={backgroundStarCount} />}

        {/* Measuring rings - tilt to align with selected star */}
        <MeasuringPivot alignTarget={focusTarget}>
          <DistanceRings rings={distanceRings} showLabels={showDistanceLabels} />
        </MeasuringPivot>

        {/* Routes between systems */}
        {routes.map((route) => {
          const from = starsByNodeId.get(route.from);
          const to = starsByNodeId.get(route.to);
          if (!from || !to) {
            return null;
          }

          return (
            <RouteLine
              key={route.id}
              route={route}
              from={from}
              to={to}
              selected={selectedRouteId === route.id}
              onSelect={() => handleRouteClick(route)}
              onHover={(hovering) =>
                handleRouteHover(hovering ? route : null)
              }
            />
          );
        })}

        {/* Local star systems (instanced for performance) */}
        <StarInstances
          stars={stars}
          selectedStarId={selectedStarId}
          connectedNodeIds={connectedNodeIds}
          currentNodeId={currentNodeId}
          visitedNodeIds={visitedNodeIds}
          reachableNodeIds={reachableNodeIds}
          starScale={starScale}
          showLabels={showLabels}
          onStarSelect={handleStarClick}
          onStarHover={handleStarHover}
        />
      </Canvas>
    </div>
  );
}
