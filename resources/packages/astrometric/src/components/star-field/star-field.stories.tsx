import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, useCallback } from "react";
import { StarField } from "./star-field";
import type { StarNode } from "@helm/types";
import type { Route, StarSelectEvent, RouteSelectEvent, HoverState, CameraMode } from "../../types";

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

// Sample stars for demos
const sampleStars: StarNode[] = [
  {
    id: 1,
    node_id: 1,
    title: "Sol",
    catalog_id: "SOL_1",
    spectral_class: "G",
    x: 0, y: 0, z: 0,
    mass: 1.0,
    radius: 1.0,
    node_type: "system",
  },
  {
    id: 2,
    node_id: 2,
    title: "Proxima Centauri",
    catalog_id: "PROX_1",
    spectral_class: "M",
    x: 1.3, y: 0.2, z: -3.9,
    mass: 0.12,
    radius: 0.15,
    node_type: "system",
  },
  {
    id: 3,
    node_id: 3,
    title: "Barnard's Star",
    catalog_id: "BARN_1",
    spectral_class: "M",
    x: -1.8, y: 5.2, z: 2.4,
    mass: 0.16,
    radius: 0.18,
    node_type: "system",
  },
  {
    id: 4,
    node_id: 4,
    title: "Sirius",
    catalog_id: "SIR_1",
    spectral_class: "A",
    x: -5.4, y: -6.2, z: 1.3,
    mass: 2.06,
    radius: 1.71,
    node_type: "system",
  },
  {
    id: 5,
    node_id: 5,
    title: "Wolf 359",
    catalog_id: "WOLF_1",
    spectral_class: "M",
    x: 3.1, y: 4.4, z: 5.3,
    mass: 0.09,
    radius: 0.16,
    node_type: "system",
  },
  {
    id: 6,
    node_id: 6,
    title: "Lalande 21185",
    catalog_id: "LAL_1",
    spectral_class: "M",
    x: -6.2, y: 1.9, z: -3.5,
    mass: 0.39,
    radius: 0.39,
    node_type: "system",
  },
  {
    id: 7,
    node_id: 7,
    title: "Vega",
    catalog_id: "VEG_1",
    spectral_class: "A",
    x: 8.4, y: -7.1, z: -15.2,
    mass: 2.14,
    radius: 2.36,
    node_type: "system",
  },
  {
    id: 8,
    node_id: 8,
    title: "Altair",
    catalog_id: "ALT_1",
    spectral_class: "A",
    x: -9.2, y: 3.1, z: 12.8,
    mass: 1.79,
    radius: 1.63,
    node_type: "system",
  },
];

const sampleRoutes: Route[] = [
  { id: "route-1", from: 1, to: 2, status: "traveled" },
  { id: "route-2", from: 1, to: 3, status: "discovered" },
  { id: "route-3", from: 2, to: 5, status: "plotted" },
  { id: "route-4", from: 3, to: 6, status: "discovered" },
  { id: "route-5", from: 4, to: 7, status: "blocked" },
];

const sampleReachableNodeIds = new Set([1, 2, 3, 4, 5, 6]);
const sampleVisitedNodeIds = new Set([1, 2]);

/**
 * Default star field with sample data
 */
export const Default: Story = {
  args: {
    stars: sampleStars,
    routes: sampleRoutes,
    currentNodeId: 1,
    reachableNodeIds: sampleReachableNodeIds,
    visitedNodeIds: sampleVisitedNodeIds,
    showBackground: false,
    showDistanceLabels: true,
  },
};

/**
 * Minimal view without background or distance rings
 */
export const Minimal: Story = {
  args: {
    stars: sampleStars.slice(0, 4),
    routes: [],
        showBackground: false,
    showDistanceLabels: false,
    distanceRings: [],
  },
};

// Generate stars with reachability based on distance
const JUMP_RANGE = 10; // light-years

let nextId = 100;
const generateRandomStars = (count: number, spread: number = 50): StarNode[] => {
  return Array.from({ length: count }, () => {
    const id = nextId++;
    const x = (Math.random() - 0.5) * spread;
    const y = (Math.random() - 0.5) * spread * 0.5;
    const z = (Math.random() - 0.5) * spread;

    return {
      id,
      node_id: id,
      title: `HD ${100000 + id}`,
      catalog_id: `HD_${id}`,
      spectral_class: (["O", "B", "A", "F", "G", "K", "M"] as const)[
        Math.floor(Math.random() * 7)
      ],
      x, y, z,
      mass: Math.random() * 5,
      radius: Math.random() * 3,
      node_type: "system",
    };
  });
};

const denseStars = generateRandomStars(4000, 80);
const denseReachableNodeIds = new Set([
  ...sampleReachableNodeIds,
  ...denseStars.filter((s) => Math.sqrt(s.x ** 2 + s.y ** 2 + s.z ** 2) <= JUMP_RANGE).map((s) => s.node_id),
]);

/**
 * Dense star field with 4000 systems (instanced rendering)
 */
export const Dense: Story = {
  args: {
    stars: [...sampleStars, ...denseStars],
    routes: sampleRoutes,
    reachableNodeIds: denseReachableNodeIds,
    showBackground: true,
    backgroundStarCount: 3000,
  },
};

// Generate stars for the interactive demo
const interactiveStars = [...sampleStars, ...generateRandomStars(100, 20)];

/**
 * Interactive demo with selection handling
 */
export const Interactive: Story = {
  parameters: { controls: { disable: true } },
  render: () => {
    const [selectedStarId, setSelectedStarId] = useState<number | null>(null);
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [hoverInfo, setHoverInfo] = useState<string>("");

    const handleStarSelect = useCallback((event: StarSelectEvent | null) => {
      if (event) {
        setSelectedStarId(event.star.id);
        setSelectedRouteId(null);
      } else {
        setSelectedStarId(null);
      }
    }, []);

    const handleRouteSelect = useCallback((event: RouteSelectEvent | null) => {
      if (event) {
        setSelectedRouteId(event.route.id);
        setSelectedStarId(null);
      } else {
        setSelectedRouteId(null);
      }
    }, []);

    const handleHoverChange = useCallback((state: HoverState) => {
      if (state.star) {
        setHoverInfo(`Hovering: ${state.star.title}`);
      } else if (state.route) {
        setHoverInfo(`Hovering route: ${state.route.id}`);
      } else {
        setHoverInfo("");
      }
    }, []);

    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <StarField
          stars={interactiveStars}
          routes={sampleRoutes}
          reachableNodeIds={sampleReachableNodeIds}
          showBackground={false}
          selectedStarId={selectedStarId}
          selectedRouteId={selectedRouteId}
          onStarSelect={handleStarSelect}
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
            Selected: {selectedStarId ?? selectedRouteId ?? "None"}
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
    stars: sampleStars,
    routes: sampleRoutes,
    reachableNodeIds: sampleReachableNodeIds,
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
    stars: sampleStars,
    routes: sampleRoutes,
    reachableNodeIds: sampleReachableNodeIds,
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
  parameters: { controls: { disable: true } },
  render: () => {
    const [cameraMode, setCameraMode] = useState<CameraMode>("perspective");

    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <StarField
          stars={sampleStars}
          routes={sampleRoutes}
          reachableNodeIds={sampleReachableNodeIds}
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
