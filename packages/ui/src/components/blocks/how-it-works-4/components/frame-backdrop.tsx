"use client";

import { cn } from "cn";
import { motion, useReducedMotion } from "motion/react";
/**
 * Photographic field behind the console, drifting under a light sweep. The
 * console covers the middle, so only the border of this image ever reads.
 * customize: swap FRAME_BACKDROP_SRC for your own art, or drop the sweep.
 */
import { useId, useState } from "react";

// Sky photo by Resul Mentes on Unsplash. `rect` pre-crops it to the frame's 4:3,
// so swap the whole URL rather than the size params if you change the art.
const FRAME_BACKDROP_SRC =
  "https://images.unsplash.com/photo-1522441815192-d9f04eb0615c?rect=0,1953,4433,3325&w=1200&q=60&auto=format";

// The delivered slice, and the user-space units both loops are drawn in.
const FRAME_BACKDROP_WIDTH = 1200;
const FRAME_BACKDROP_HEIGHT = 900;

/**
 * An SVG child scales and rotates about the user-space origin, which would
 * swing the image out of frame, so the box is redefined to the element itself.
 */
const PIVOT = {
  transformBox: "fill-box",
  transformOrigin: "center",
} as const;

// Camera drift. Keep scale above 1 at every waypoint, or the translate exposes
// the frame edge.
const DRIFT = {
  rotate: [0, 0.5, -0.4, 0.3, 0],
  scale: [1.06, 1.1, 1.05, 1.09, 1.06],
  x: [0, -17, 13, -7, 0],
  y: [0, 11, -9, 7, 0],
};

/**
 * A soft highlight crossing the band, like light moving over water. Three
 * waypoints so it shares the `times` of its own fade.
 */
const SWEEP_START = -360;
const SWEEP_END = FRAME_BACKDROP_WIDTH + 360;

export function FrameBackdrop({ className }: { className?: string }) {
  // One id, suffixed per def, so two instances on a page never collide.
  const uid = useId().replace(/:/g, "");
  const sweepId = `${uid}-sweep`;
  // Frozen demo: this drift is JS-driven, so a capture cannot pin it.
  const [frozen] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.dataset.demo === "frozen"
  );
  const reduceMotion = useReducedMotion() || frozen;

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 size-full",
        className
      )}
      preserveAspectRatio="none"
      viewBox={`0 0 ${FRAME_BACKDROP_WIDTH} ${FRAME_BACKDROP_HEIGHT}`}
    >
      <defs>
        <radialGradient id={sweepId}>
          <stop offset="0%" stopColor="white" stopOpacity={0.55} />
          <stop offset="55%" stopColor="white" stopOpacity={0.16} />
          <stop offset="100%" stopColor="white" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* preserveAspectRatio="none": the art is pre-cropped to 4:3, so reshaping the
          frame stretches it gracefully instead of letterboxing. */}
      <motion.image
        // Held at the drift's own base scale when motion is reduced, so the
        // framing matches the moving version instead of snapping back to 1.
        animate={reduceMotion ? { scale: 1.06 } : DRIFT}
        height={FRAME_BACKDROP_HEIGHT}
        href={FRAME_BACKDROP_SRC}
        preserveAspectRatio="none"
        style={PIVOT}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                duration: 47,
                ease: "easeInOut",
                repeat: Number.POSITIVE_INFINITY,
                times: [0, 0.26, 0.52, 0.79, 1],
              }
        }
        width={FRAME_BACKDROP_WIDTH}
        x="0"
        y="0"
      />

      {/* Always rendered, so the server and client markup agree: reduced motion
          is only known on the client, and it just parks the sweep unseen. */}
      <motion.ellipse
        animate={
          reduceMotion
            ? { opacity: 0 }
            : {
                opacity: [0, 0.5, 0],
                x: [SWEEP_START, FRAME_BACKDROP_WIDTH / 2, SWEEP_END],
              }
        }
        // Keep cx at 0 and travel on the transform: animating the `cx` geometry
        // attribute instead makes SVG reject the first frame outright.
        cx={0}
        cy={FRAME_BACKDROP_HEIGHT * 0.36}
        fill={`url(#${sweepId})`}
        opacity={0}
        rx={430}
        ry={300}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                duration: 19,
                ease: "easeInOut",
                repeat: Number.POSITIVE_INFINITY,
                repeatDelay: 5,
                times: [0, 0.5, 1],
              }
        }
      />
    </svg>
  );
}
