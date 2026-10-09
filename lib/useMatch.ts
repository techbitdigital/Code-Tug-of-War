"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createMatch, currentRound, matchReducer, timeLimitMs, type MatchConfig, type Side } from "./engine";

const TICK_MS = 100;

// Keyboard map for two teams sharing one laptop: number keys choose, Space / Enter pull.
const KEYS: Record<Side, { pick: string[]; pull: string }> = {
  a: { pick: ["1", "2", "3", "4"], pull: " " },
  b: { pick: ["7", "8", "9", "0"], pull: "Enter" },
};

/** React glue for the engine: owns the clock, the ticker and the keyboard. */
export function useMatch(config: MatchConfig) {
  const [state, dispatch] = useReducer(matchReducer, config, createMatch);
  const [now, setNow] = useState(() => Date.now());

  const running = state.phase === "question" && state.pausedAt === null;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      dispatch({ type: "TICK", now: t });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  const actions = useMemo(
    () => ({
      start: () => dispatch({ type: "START", now: Date.now() }),
      pick: (side: Side, index: number) => dispatch({ type: "PICK", side, index }),
      answer: (side: Side, value: number | string) => dispatch({ type: "ANSWER", side, value, now: Date.now() }),
      next: () => dispatch({ type: "NEXT", now: Date.now() }),
      skip: () => dispatch({ type: "SKIP", now: Date.now() }),
      pause: () => dispatch({ type: "PAUSE", now: Date.now() }),
      resume: () => dispatch({ type: "RESUME", now: Date.now() }),
      restart: () => dispatch({ type: "RESTART" }),
    }),
    [],
  );

  // Keyboard: read the latest state through a ref so the listener is attached once.
  const stateRef = useRef(state);
  stateRef.current = state;
  const onKey = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const s = stateRef.current;
      if (s.phase !== "question" || s.pausedAt !== null) return;
      if (currentRound(s).answer.type !== "mcq") return;

      const sides: Side[] = s.config.mode === "solo" ? ["a"] : ["a", "b"];
      for (const side of sides) {
        const index = KEYS[side].pick.indexOf(event.key);
        // Solo players may use either set of number keys.
        const soloIndex = s.config.mode === "solo" && index < 0 ? KEYS.b.pick.indexOf(event.key) : index;
        if (soloIndex >= 0) {
          actions.pick(side, soloIndex);
          return;
        }
        const isPull = event.key === KEYS[side].pull || (s.config.mode === "solo" && event.key === KEYS.b.pull);
        if (isPull) {
          // Stop Space/Enter also "clicking" whatever button has focus.
          event.preventDefault();
          const picked = s.teams[side].picked;
          if (picked !== null) actions.answer(side, picked);
          return;
        }
      }
    },
    [actions],
  );
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  const clock = state.pausedAt ?? now;
  const timerFraction =
    state.phase === "question" ? Math.max(0, Math.min(1, (state.deadline - clock) / timeLimitMs(state))) : state.phase === "ready" ? 1 : 0;
  const secondsLeft = state.phase === "question" ? Math.max(0, Math.ceil((state.deadline - clock) / 1000)) : 0;
  const coolingDown = (side: Side) => state.phase === "question" && clock < state.teams[side].lockedUntil;

  return { state, actions, round: currentRound(state), timerFraction, secondsLeft, coolingDown };
}
