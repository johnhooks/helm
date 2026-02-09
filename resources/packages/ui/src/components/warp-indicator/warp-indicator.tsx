import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

export interface WarpIndicatorProps {
  /**
   * Power level from 0-100
   */
  level?: number;
  /**
   * Size variant
   */
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  /**
   * Number of segments
   */
  segments?: number;
  /**
   * Level transition duration in ms
   */
  transitionMs?: number;
  /**
   * Surface tone
   */
  tone?:
    | "neutral"
    | "base"
    | "accent"
    | "muted"
    | "danger"
    | "success"
    | "warning"
    | "info"
    | "orange"
    | "gold"
    | "peach"
    | "sunset"
    | "blue"
    | "sky"
    | "ice"
    | "lilac"
    | "violet"
    | "plum"
    | "hopbush";
  /**
   * Additional CSS class names
   */
  className?: string;
  /**
   * Inline styles
   */
  style?: CSSProperties;
  /**
   * Test ID for testing
   */
  "data-testid"?: string;
}

export function WarpIndicator({
  level = 60,
  size = "md",
  segments = 10,
  transitionMs = 60000,
  tone = "accent",
  className = "",
  style,
  "data-testid": testId,
}: WarpIndicatorProps) {
  const clamped = Math.min(100, Math.max(0, level));
  const [animatedLevel, setAnimatedLevel] = useState(clamped);
  const levelRef = useRef(clamped);

  useEffect(() => {
    if (transitionMs <= 0) {
      levelRef.current = clamped;
      setAnimatedLevel(clamped);
      return;
    }

    const start = performance.now();
    const from = levelRef.current;
    const to = clamped;
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / transitionMs);
      const eased = progress * (2 - progress);
      const nextValue = from + (to - from) * eased;
      levelRef.current = nextValue;
      setAnimatedLevel(nextValue);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [clamped, transitionMs]);

  const speed = Math.max(1.4, 6 - animatedLevel * 0.045);
  const intensity = 0.2 + (animatedLevel / 100) * 0.8;
  const playState = animatedLevel === 0 ? "paused" : "running";

  const classNames = [
    "helm-warp-indicator",
    "helm-surface",
    `helm-surface--${tone}`,
    `helm-warp-indicator--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const indicatorStyle = {
    ...style,
    "--helm-warp-speed": `${speed}s`,
    "--helm-warp-intensity": intensity,
    "--helm-warp-play": playState,
    "--helm-warp-segments": segments,
  } as CSSProperties;

  const segmentDelay = 0.12;

  return (
    <span className={classNames} style={indicatorStyle} data-testid={testId}>
      <span className="helm-warp-indicator__shell">
        <span className="helm-warp-indicator__core">
          {Array.from({ length: segments }, (_, index) => {
            const distance = Math.min(index, segments - 1 - index);
            return (
              <span
                key={index}
                className="helm-warp-indicator__segment"
                style={
                  {
                    "--helm-warp-delay": `${distance * segmentDelay}s`,
                  } as CSSProperties
                }
              />
            );
          })}
        </span>
      </span>
    </span>
  );
}
