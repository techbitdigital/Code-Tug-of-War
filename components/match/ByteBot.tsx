"use client";

import { motion, useReducedMotion, type TargetAndTransition, type Transition } from "framer-motion";
import { motionTokens } from "@/lib/motion";
import type { Side } from "./TeamPanel";

export type BotMood = "idle" | "heave" | "stumble" | "cheer" | "fallen";

const BODY = { a: "var(--team-a)", b: "var(--team-b)" } as const;
const LIMB = { a: "var(--team-a-deep)", b: "var(--team-b-deep)" } as const;

// Poses are written for a bot facing right (Team A). Team B is mirrored, so the same
// numbers make it lean the right way. Negative rotate = leaning back on the rope.
const POSE: Record<BotMood, TargetAndTransition> = {
  idle: { rotate: 0, x: 0, y: 0 },
  heave: { rotate: -13, x: -7, y: 2 },
  stumble: { rotate: 10, x: 8, y: 0 },
  cheer: { rotate: 0, x: 0, y: [0, -16, 0] },
  fallen: { rotate: 24, x: 10, y: 8 },
};

function poseTransition(mood: BotMood, delay: number, reduced: boolean): Transition {
  if (reduced) return { duration: 0 };
  switch (mood) {
    case "cheer":
      return { y: { duration: 0.5, repeat: Infinity, repeatDelay: 0.15, ease: "easeOut", delay }, default: motionTokens.snap };
    case "heave":
    case "stumble":
      return { ...motionTokens.pull, delay };
    case "fallen":
      return { ...motionTokens.settle, delay };
    default:
      return motionTokens.settle;
  }
}

interface ByteBotProps {
  side: Side;
  /** Position of the hands on the rope, in the parent SVG's user units. */
  x: number;
  y: number;
  scale?: number;
  mood?: BotMood;
  /** Seconds; staggers the bots so a team doesn't move like one block. */
  delay?: number;
}

// A Byte Bot leaning back on the rope. Local origin is where the hands grip the rope;
// the feet sit 75 units below it.
export default function ByteBot({ side, x, y, scale = 1, mood = "idle", delay = 0 }: ByteBotProps) {
  const reduced = useReducedMotion() ?? false;
  const flip = side === "b" ? -1 : 1;
  const face = mood === "cheer" ? "happy" : mood === "fallen" ? "dizzy" : "normal";

  return (
    <g transform={`translate(${x} ${y}) scale(${flip * scale} ${scale})`}>
      <motion.g
        initial={false}
        animate={POSE[mood]}
        transition={poseTransition(mood, delay, reduced)}
        style={{ originX: "47%", originY: "100%", transformBox: "fill-box" }}
      >
        {/* Idle "straining" bob: a tiny loop so the scene never looks frozen. */}
        <motion.g
          animate={mood === "idle" && !reduced ? { y: [0, -1.6, 0], rotate: [0, -1.5, 0] } : { y: 0, rotate: 0 }}
          transition={
            mood === "idle" && !reduced
              ? { duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: delay * 3 }
              : { duration: 0.2 }
          }
          style={{ originX: "47%", originY: "100%", transformBox: "fill-box" }}
        >
          <BotParts side={side} face={face} mood={mood} />
        </motion.g>
      </motion.g>
    </g>
  );
}

function BotParts({ side, face, mood }: { side: Side; face: "normal" | "happy" | "dizzy"; mood: BotMood }) {
  const armsUp = mood === "cheer";
  return (
    <>
      {/* back leg + shoe */}
      <path d="M -6 30 L -22 50 L -32 70" fill="none" stroke="var(--ink)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="-34" cy="73" rx="10" ry="5" fill="var(--ink)" />
      {/* front leg + shoe */}
      <path d="M 0 32 L 14 50 L 16 70" fill="none" stroke="var(--ink)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="20" cy="73" rx="10" ry="5" fill="var(--ink)" />
      {/* back arm */}
      <path d="M -14 -6 L 20 1" fill="none" stroke={LIMB[side]} strokeWidth="7" strokeLinecap="round" />
      {/* torso, tilted back */}
      <g transform="translate(-9 10) rotate(-24)">
        <rect x="-15" y="-23" width="30" height="42" rx="10" fill={BODY[side]} />
        <rect x="-8" y="-12" width="16" height="12" rx="4" fill="#fff" opacity="0.28" />
        <circle cx="0" cy="8" r="3" fill="var(--focus)" />
      </g>
      {/* head with visor and antenna */}
      <g transform="translate(-24 -30) rotate(-16)">
        <line x1="2" y1="-15" x2="4" y2="-25" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="4" cy="-27" r="4" fill="var(--focus)" stroke="var(--ink)" strokeWidth="2" />
        <rect x="-18" y="-15" width="36" height="29" rx="10" fill="#fff" stroke="var(--ink)" strokeWidth="3" />
        <rect x="-11" y="-8" width="24" height="13" rx="6" fill="var(--ink)" />
        <Eyes face={face} />
      </g>
      {/* front arm: on the rope, or punched up in celebration */}
      {armsUp ? (
        <>
          <path d="M -10 -4 L 4 -40" fill="none" stroke={LIMB[side]} strokeWidth="7" strokeLinecap="round" />
          <circle cx="5" cy="-42" r="5.5" fill="#CBD2E6" stroke="var(--ink)" strokeWidth="2" />
        </>
      ) : (
        <>
          <path d="M -10 0 L 24 3" fill="none" stroke={LIMB[side]} strokeWidth="7" strokeLinecap="round" />
          <circle cx="27" cy="3" r="5" fill="#CBD2E6" stroke="var(--ink)" strokeWidth="2" />
        </>
      )}
      <circle cx="21" cy="1.5" r="5" fill="#CBD2E6" stroke="var(--ink)" strokeWidth="2" />
    </>
  );
}

function Eyes({ face }: { face: "normal" | "happy" | "dizzy" }) {
  if (face === "happy") {
    return (
      <g fill="none" stroke="#5EEAD4" strokeWidth="2" strokeLinecap="round">
        <path d="M -5.5 0 Q -3 -4 -0.5 0" />
        <path d="M 4.5 0 Q 7 -4 9.5 0" />
      </g>
    );
  }
  if (face === "dizzy") {
    return (
      <g stroke="#FCA5A5" strokeWidth="1.8" strokeLinecap="round">
        <path d="M -5 -4 L -1 1 M -1 -4 L -5 1" />
        <path d="M 5 -4 L 9 1 M 9 -4 L 5 1" />
      </g>
    );
  }
  return (
    <>
      <circle cx="-3" cy="-1.5" r="2.6" fill="#5EEAD4" />
      <circle cx="7" cy="-1.5" r="2.6" fill="#5EEAD4" />
    </>
  );
}
