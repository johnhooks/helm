import { useMemo } from "react";
import {
  SphereGeometry,
  ShaderMaterial,
  BackSide,
  AdditiveBlending,
  Color,
} from "three";

export interface GalacticPlaneProps {
  /** Radius of the sky sphere */
  radius?: number;
  /** Base opacity of the glow */
  opacity?: number;
  /** Color of the galactic band */
  color?: string;
  /** How tight the band is (higher = thinner band) */
  bandTightness?: number;
  /** Direction toward galactic core (brighter spot) - normalized vector on XZ plane */
  coreDirection?: [number, number, number];
  /** Intensity of the core glow (0-1) */
  coreIntensity?: number;
}

// Vertex shader - pass world position to fragment
const vertexShader = `
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// Fragment shader - band around the equator (Y=0) of a surrounding sphere
const fragmentShader = `
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform float uBandTightness;
  uniform vec3 uCoreDirection;
  uniform float uCoreIntensity;

  varying vec3 vWorldPosition;

  void main() {
    // Normalize the position to get direction from center
    vec3 dir = normalize(vWorldPosition);

    // How close to the equator (Y=0)?
    // dir.y is -1 at bottom, 0 at equator, +1 at top
    float distFromEquator = abs(dir.y);

    // Band intensity - strongest at equator, fading toward poles
    float band = 1.0 - smoothstep(0.0, 1.0 / uBandTightness, distFromEquator);

    // Add some noise/variation to the band edges
    float variation = sin(atan(dir.z, dir.x) * 8.0) * 0.1 + 1.0;
    band *= variation;

    // Core direction glow (brighter in one direction)
    float coreGlow = 0.0;
    if (uCoreIntensity > 0.0) {
      vec3 coreDirNorm = normalize(uCoreDirection);
      // Project both to XZ plane for comparison
      vec2 dirXZ = normalize(dir.xz + 0.0001);
      vec2 coreXZ = normalize(coreDirNorm.xz + 0.0001);

      float alignment = dot(dirXZ, coreXZ);
      alignment = max(0.0, alignment);

      // Core glow concentrated in band
      coreGlow = pow(alignment, 4.0) * band * uCoreIntensity;
    }

    float alpha = (band * 0.5 + coreGlow) * uOpacity;

    // Slightly warmer color toward the core
    vec3 finalColor = uColor + vec3(coreGlow * 0.15, coreGlow * 0.08, 0.0);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export function GalacticPlane({
  radius = 180,
  opacity = 0.25,
  color = "#6080a0",
  bandTightness = 3.0,
  coreDirection = [1, 0, 0.2],
  coreIntensity = 0.5,
}: GalacticPlaneProps) {
  const geometry = useMemo(() => {
    // Large sphere surrounding the scene
    return new SphereGeometry(radius, 64, 32);
  }, [radius]);

  const material = useMemo(() => {
    // Normalize core direction
    const len = Math.sqrt(
      coreDirection[0] ** 2 +
        coreDirection[1] ** 2 +
        coreDirection[2] ** 2
    );
    const normalizedCore =
      len > 0
        ? [
            coreDirection[0] / len,
            coreDirection[1] / len,
            coreDirection[2] / len,
          ]
        : [1, 0, 0];

    return new ShaderMaterial({
      uniforms: {
        uOpacity: { value: opacity },
        uColor: { value: new Color(color) },
        uBandTightness: { value: bandTightness },
        uCoreDirection: { value: normalizedCore },
        uCoreIntensity: { value: coreIntensity },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      side: BackSide,  // Render inside of sphere
      blending: AdditiveBlending,
      depthWrite: false,
    });
  }, [opacity, color, bandTightness, coreDirection, coreIntensity]);

  return <mesh geometry={geometry} material={material} />;
}
