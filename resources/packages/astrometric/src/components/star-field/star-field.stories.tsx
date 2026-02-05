import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, useCallback } from "react";
import { StarField } from "./star-field";
import type { StarSystem, Route, StarSelectEvent, RouteSelectEvent, HoverState, CameraMode } from "../../types";

const meta: Meta<typeof StarField> = {
  title: "Astrometric/StarField",
  component: StarField,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100vw", height: "100vh", background: "#0a0a0a" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StarField>;

// Sample star systems for demos
const sampleSystems: StarSystem[] = [
  {
    id: "sol",
    name: "Sol",
    position: { x: 0, y: 0, z: 0 },
    spectralClass: "G",
    isCurrent: true,
    visited: true,
    reachable: true,
  },
  {
    id: "proxima",
    name: "Proxima Centauri",
    position: { x: 1.3, y: 0.2, z: -3.9 },
    spectralClass: "M",
    visited: true,
    reachable: true,
  },
  {
    id: "barnard",
    name: "Barnard's Star",
    position: { x: -1.8, y: 5.2, z: 2.4 },
    spectralClass: "M",
    visited: false,
    reachable: true,
  },
  {
    id: "sirius",
    name: "Sirius",
    position: { x: -5.4, y: -6.2, z: 1.3 },
    spectralClass: "A",
    visited: false,
    reachable: true,
  },
  {
    id: "wolf",
    name: "Wolf 359",
    position: { x: 3.1, y: 4.4, z: 5.3 },
    spectralClass: "M",
    visited: false,
    reachable: true,
  },
  {
    id: "lalande",
    name: "Lalande 21185",
    position: { x: -6.2, y: 1.9, z: -3.5 },
    spectralClass: "M",
    visited: false,
    reachable: true,
  },
  {
    id: "vega",
    name: "Vega",
    position: { x: 8.4, y: -7.1, z: -15.2 },
    spectralClass: "A",
    visited: false,
    reachable: false,
  },
  {
    id: "altair",
    name: "Altair",
    position: { x: -9.2, y: 3.1, z: 12.8 },
    spectralClass: "A",
    visited: false,
    reachable: false,
  },
];

const sampleRoutes: Route[] = [
  { id: "route-1", from: "sol", to: "proxima", status: "traveled" },
  { id: "route-2", from: "sol", to: "barnard", status: "discovered" },
  { id: "route-3", from: "proxima", to: "wolf", status: "plotted" },
  { id: "route-4", from: "barnard", to: "lalande", status: "discovered" },
  { id: "route-5", from: "sirius", to: "vega", status: "blocked" },
];

/**
 * Default star field with sample data
 */
export const Default: Story = {
  args: {
    systems: sampleSystems,
    routes: sampleRoutes,
    showBackground: false,
    showDistanceLabels: true,
  },
};

/**
 * Minimal view without background or distance rings
 */
export const Minimal: Story = {
  args: {
    systems: sampleSystems.slice(0, 4),
    routes: [],
        showBackground: false,
    showDistanceLabels: false,
    distanceRings: [],
  },
};

// Generate stars with reachability based on distance
const JUMP_RANGE = 10; // light-years

const generateRandomStars = (count: number, spread: number = 50): StarSystem[] => {
  return Array.from({ length: count }, (_, i) => {
    const position = {
      x: (Math.random() - 0.5) * spread,
      y: (Math.random() - 0.5) * spread * 0.5,
      z: (Math.random() - 0.5) * spread,
    };
    const distance = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);

    return {
      id: `star-${i}`,
      name: `HD ${100000 + i}`,
      position,
      spectralClass: (["O", "B", "A", "F", "G", "K", "M"] as const)[
        Math.floor(Math.random() * 7)
      ],
      visited: Math.random() > 0.95,
      reachable: distance <= JUMP_RANGE,
    };
  });
};

/**
 * Dense star field with 4000 systems (instanced rendering)
 */
export const Dense: Story = {
  args: {
    systems: [...sampleSystems, ...generateRandomStars(4000, 80)],
    routes: sampleRoutes,
    showBackground: true,
    backgroundStarCount: 3000,
  },
};

// Generate stars for the interactive demo
const interactiveSystems = [...sampleSystems, ...generateRandomStars(100, 20)];

/**
 * Interactive demo with selection handling
 */
export const Interactive: Story = {
  render: () => {
    const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [hoverInfo, setHoverInfo] = useState<string>("");

    const handleSystemSelect = useCallback((event: StarSelectEvent | null) => {
      if (event) {
        setSelectedSystemId(event.system.id);
        setSelectedRouteId(null);
      } else {
        setSelectedSystemId(null);
      }
    }, []);

    const handleRouteSelect = useCallback((event: RouteSelectEvent | null) => {
      if (event) {
        setSelectedRouteId(event.route.id);
        setSelectedSystemId(null);
      } else {
        setSelectedRouteId(null);
      }
    }, []);

    const handleHoverChange = useCallback((state: HoverState) => {
      if (state.system) {
        setHoverInfo(`Hovering: ${state.system.name}`);
      } else if (state.route) {
        setHoverInfo(`Hovering route: ${state.route.id}`);
      } else {
        setHoverInfo("");
      }
    }, []);

    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <StarField
          systems={interactiveSystems}
          routes={sampleRoutes}
          showBackground={false}
          selectedSystemId={selectedSystemId}
          selectedRouteId={selectedRouteId}
          onSystemSelect={handleSystemSelect}
          onRouteSelect={handleRouteSelect}
          onHoverChange={handleHoverChange}
        />
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            background: "rgba(10, 10, 10, 0.9)",
            color: "#f0e6d2",
            padding: "12px 16px",
            borderRadius: "8px",
            fontFamily: "Antonio, sans-serif",
            fontSize: "14px",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            Selected: {selectedSystemId || selectedRouteId || "None"}
          </div>
          <div style={{ color: "#a39a88" }}>{hoverInfo || "Hover over a star"}</div>
        </div>
      </div>
    );
  },
};

/**
 * Custom distance rings with jump range emphasis
 */
export const CustomDistanceRings: Story = {
  args: {
    systems: sampleSystems,
    routes: sampleRoutes,
    showBackground: false,
    distanceRings: [
      { distance: 1, label: "1 ly", type: "minor" },
      { distance: 2.5, label: "2.5 ly", type: "minor" },
      { distance: 5, label: "5 ly", type: "minor" },
      { distance: 7, label: "7 ly", type: "major" },  // Cold jump range
      { distance: 10, label: "10 ly", type: "major" }, // Sensor range
      { distance: 15, label: "15 ly", type: "minor" },
    ],
  },
};

/**
 * Camera controls disabled
 */
export const StaticView: Story = {
  args: {
    systems: sampleSystems,
    routes: sampleRoutes,
    showBackground: false,
    enableControls: false,
    initialCameraDistance: 25,
  },
};

const cameraModes: { mode: CameraMode; label: string; description: string }[] = [
  { mode: "perspective", label: "Perspective", description: "Standard 3D view with depth" },
  { mode: "orthographic", label: "Orthographic", description: "Flat projection, no distortion" },
  { mode: "narrow", label: "Narrow FOV", description: "Reduced perspective warping" },
];

/**
 * Compare different camera projection modes
 */
export const CameraModes: Story = {
  render: () => {
    const [cameraMode, setCameraMode] = useState<CameraMode>("perspective");

    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <StarField
          systems={sampleSystems}
          routes={sampleRoutes}
          showBackground={false}
          cameraMode={cameraMode}
        />
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            background: "rgba(10, 10, 10, 0.9)",
            color: "#f0e6d2",
            padding: "16px",
            borderRadius: "8px",
            fontFamily: "Antonio, sans-serif",
          }}
        >
          <div style={{ marginBottom: 12, fontSize: "14px", color: "#a39a88" }}>
            Camera Mode
          </div>
          {cameraModes.map(({ mode, label, description }) => (
            <label
              key={mode}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                marginBottom: 8,
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="cameraMode"
                value={mode}
                checked={cameraMode === mode}
                onChange={() => setCameraMode(mode)}
                style={{ marginTop: 3 }}
              />
              <div>
                <div style={{ fontSize: "14px" }}>{label}</div>
                <div style={{ fontSize: "11px", color: "#a39a88" }}>{description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  },
};
