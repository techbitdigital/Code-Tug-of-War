"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { motionTokens } from "@/lib/motion";
import ByteBot, { type BotMood } from "./ByteBot";
import type { Side } from "./TeamPanel";

interface RopeTrackProps {
  /** -pullsToWin (Team A wins) ... +pullsToWin (Team B wins). */
  ropePosition: number;
  pullsToWin: 3 | 5 | 7;
}

// Drawing units. The arena scales as one picture, so it looks the same on a phone and a projector.
const W = 576;
const H = 256;
const MID = W / 2;
const ROPE_Y = 128;
const GROUND_Y = 230;
const WIN_DX = 80; // the flag travels this far to win; the losers end up over the line
const HEAVE_MS = 1100; // how long a pull reaction lasts before the bots settle

export default function RopeTrack({ ropePosition, pullsToWin }: RopeTrackProps) {
  const reduced = useReducedMotion() ?? false;
  const step = WIN_DX / pullsToWin;
  const shift = ropePosition * step;

  const winner: Side | null =
    ropePosition <= -pullsToWin ? "a" : ropePosition >= pullsToWin ? "b" : null;

  // Which team just pulled. Set when ropePosition changes, cleared after HEAVE_MS.
  const [puller, setPuller] = useState<Side | null>(null);
  const [pullId, setPullId] = useState(0);
  const prev = useRef(ropePosition);
  useEffect(() => {
    const delta = ropePosition - prev.current;
    prev.current = ropePosition;
    if (delta === 0) return;
    setPuller(delta < 0 ? "a" : "b");
    setPullId((n) => n + 1);
    const t = setTimeout(() => setPuller(null), HEAVE_MS);
    return () => clearTimeout(t);
  }, [ropePosition]);

  const moodFor = (side: Side): BotMood => {
    if (winner) return winner === side ? "cheer" : "fallen";
    if (!puller) return "idle";
    return puller === side ? "heave" : "stumble";
  };

  const label = winner
    ? `${winner === "a" ? "Team A" : "Team B"} wins the tug of war`
    : ropePosition === 0
      ? "Rope on the centre line"
      : `Rope ${Math.abs(ropePosition)} ${Math.abs(ropePosition) === 1 ? "pull" : "pulls"} toward ${
          ropePosition < 0 ? "Team A" : "Team B"
        }`;

  return (
    <div
      role="img"
      aria-label={`${label}. ${pullsToWin} pulls win.`}
      className="h-[var(--arena-h)] w-full @3xl:h-full"
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full overflow-visible" aria-hidden="true">
        {/* ground shadow */}
        <ellipse cx={MID} cy={GROUND_Y} rx={W * 0.46} ry="10" fill="var(--ink)" opacity="0.06" />

        {/* pull markers: one dot per pull, the win spots in team colour */}
        {Array.from({ length: pullsToWin * 2 + 1 }, (_, i) => {
          const k = i - pullsToWin;
          const edge = Math.abs(k) === pullsToWin;
          const reached = winner && ((winner === "a" && k === -pullsToWin) || (winner === "b" && k === pullsToWin));
          const fill =
            k === 0 ? "var(--focus)" : edge ? (k < 0 ? "var(--team-a)" : "var(--team-b)") : "var(--line)";
          return (
            <motion.circle
              key={i}
              cx={MID + k * step}
              cy={GROUND_Y + 16}
              r={edge || k === 0 ? 6 : 4}
              fill={fill}
              animate={reached && !reduced ? { scale: [1, 1.8, 1] } : { scale: 1 }}
              transition={reached && !reduced ? { duration: 0.8, repeat: Infinity } : { duration: 0.2 }}
              style={{ transformBox: "fill-box", originX: "50%", originY: "50%" }}
            />
          );
        })}

        {/* yellow centre line */}
        <line x1={MID} y1="20" x2={MID} y2={GROUND_Y + 4} stroke="var(--focus)" strokeWidth="5" strokeLinecap="round" />

        {/* everything that moves with the rope */}
        {/* A pull is a yank: past the new spot, then back. Other moves just spring. */}
        <motion.g
          initial={false}
          animate={{ x: puller && !reduced ? [null, shift + (puller === "a" ? -1 : 1) * 18, shift] : shift }}
          transition={
            reduced
              ? { duration: 0 }
              : puller
                ? { duration: 0.9, times: [0, 0.45, 1], ease: ["easeOut", "easeInOut"] }
                : motionTokens.pull
          }
        >
          {/* rope with loose tails behind the back pullers */}
          <path
            d={`M 46 ${GROUND_Y} C 46 ${ROPE_Y + 30}, 62 ${ROPE_Y + 2}, 100 ${ROPE_Y} L ${W - 100} ${ROPE_Y} C ${W - 62} ${ROPE_Y + 2}, ${W - 46} ${ROPE_Y + 30}, ${W - 46} ${GROUND_Y}`}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <ByteBot side="a" x={112} y={ROPE_Y - 2} scale={1.28} mood={moodFor("a")} delay={0.06} />
          <ByteBot side="a" x={200} y={ROPE_Y - 2} scale={1.28} mood={moodFor("a")} />
          <ByteBot side="b" x={W - 200} y={ROPE_Y - 2} scale={1.28} mood={moodFor("b")} />
          <ByteBot side="b" x={W - 112} y={ROPE_Y - 2} scale={1.28} mood={moodFor("b")} delay={0.06} />
          {/* flag knot: swings when the rope jerks */}
          <motion.g
            key={ropePosition}
            initial={reduced ? false : { rotate: ropePosition > prev.current ? -28 : 28 }}
            animate={{ rotate: 0 }}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 6 }}
            style={{ transformBox: "fill-box", originX: "50%", originY: "0%" }}
          >
            <path
              d={`M ${MID - 7} ${ROPE_Y} L ${MID + 7} ${ROPE_Y} L ${MID + 2} ${ROPE_Y + 30} L ${MID - 3} ${ROPE_Y + 24} Z`}
              fill="var(--accent)"
            />
          </motion.g>
          <circle cx={MID} cy={ROPE_Y} r="6" fill="var(--accent)" stroke="#fff" strokeWidth="2.5" />
        </motion.g>

        {/* "PULL!" burst over the pulling side */}
        {puller && !reduced && (
          <motion.text
            key={pullId}
            x={puller === "a" ? W * 0.27 : W * 0.73}
            y={52}
            textAnchor="middle"
            initial={{ opacity: 0, scale: 0.4, y: 12 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.15, 1, 1], y: [12, 0, -4, -14] }}
            transition={{ duration: HEAVE_MS / 1000, times: [0, 0.25, 0.7, 1] }}
            style={{ transformBox: "fill-box", originX: "50%", originY: "50%" }}
            className="font-display"
            fontSize="44"
            fontWeight="900"
            fill={puller === "a" ? "var(--team-a)" : "var(--team-b)"}
            stroke="#fff"
            strokeWidth="6"
            paintOrder="stroke"
          >
            PULL!
          </motion.text>
        )}
      </svg>
    </div>
  );
}
