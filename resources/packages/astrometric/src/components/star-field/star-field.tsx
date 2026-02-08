import { Canvas } from "@react-three/fiber";
import { useMemo, useCallback, useState } from "react";
import type {
  StarFieldProps,
  StarSystem,
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
  systems,
  routes = [],
  distanceRings = DEFAULT_DISTANCE_RINGS,
  backgroundStarCount = DEFAULT_BACKGROUND_STAR_COUNT,
  selectedSystemId = null,
  selectedRouteId = null,
  onSystemSelect,
  onRouteSelect,
  onHoverChange,
  onCameraChange,
  showBackground = false,
  showDistanceLabels = true,
  enableControls = true,
  initialCameraDistance = DEFAULT_CAMERA_DISTANCE,
  minDistance = DEFAULT_MIN_DISTANCE,
  maxDistance = DEFAULT_MAX_DISTANCE,
  cameraMode = "perspective",
  className = "",
  style,
  "data-testid": testId,
}: StarFieldProps) {
  const [hoverState, setHoverState] = useState<HoverState>({
    system: null,
    route: null,
  });

  // Build system lookup for routes
  const systemsById = useMemo(() => {
    const map = new Map<string, StarSystem>();
    systems.forEach((s) => map.set(s.id, s));
    return map;
  }, [systems]);

  // Get selected system's position for camera focus
  const focusTarget: Position3D | null = useMemo(() => {
    if (!selectedSystemId) {
      return null;
    }
    const system = systemsById.get(selectedSystemId);
    return system?.position ?? null;
  }, [selectedSystemId, systemsById]);

  // Track which systems have routes connected
  const connectedSystemIds = useMemo(() => {
    const ids = new Set<string>();
    routes.forEach((route) => {
      ids.add(route.from);
      ids.add(route.to);
    });
    return ids;
  }, [routes]);

  // Handle system selection
  const handleSystemClick = useCallback(
    (system: StarSystem) => {
      if (!onSystemSelect) {
        return;
      }

      if (selectedSystemId === system.id) {
        onSystemSelect(null);
      } else {
        const event: StarSelectEvent = {
          system,
          distance: distanceFromOrigin(system.position),
        };
        onSystemSelect(event);
      }
    },
    [onSystemSelect, selectedSystemId]
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
        const from = systemsById.get(route.from);
        const to = systemsById.get(route.to);
        if (!from || !to) {
          return;
        }

        const event: RouteSelectEvent = {
          route,
          from,
          to,
          distance: distanceFromOrigin(from.position) + distanceFromOrigin(to.position),
        };
        onRouteSelect(event);
      }
    },
    [onRouteSelect, selectedRouteId, systemsById]
  );

  // Handle hover changes
  const handleSystemHover = useCallback(
    (system: StarSystem | null) => {
      const newState = { ...hoverState, system };
      setHoverState(newState);
      onHoverChange?.(newState);
    },
    [hoverState, onHoverChange]
  );

  const handleRouteHover = useCallback(
    (route: Route | null) => {
      const newState = { ...hoverState, route };
      setHoverState(newState);
      onHoverChange?.(newState);
    },
    [hoverState, onHoverChange]
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
          const from = systemsById.get(route.from);
          const to = systemsById.get(route.to);
          if (!from || !to) {
            return null;
          }

          return (
            <RouteLine
              key={route.id}
              route={route}
              from={from.position}
              to={to.position}
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
          systems={systems}
          selectedSystemId={selectedSystemId}
          connectedSystemIds={connectedSystemIds}
          onSystemSelect={handleSystemClick}
          onSystemHover={handleSystemHover}
        />
      </Canvas>
    </div>
  );
}
