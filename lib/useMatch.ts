"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createMatch, currentRound, matchReducer, timeLimitMs, type MatchConfig, type Side } from "./engine";

const TICK_MS = 100;

// Keyboard map for two teams sharing one laptop: letter keys choose, Space / Enter lock in.
// Team A sits on the left of the keyboard, Team B on the right.
export const KEYS: Record<Side, { pick: string[]; lock: string; lockLabel: string }> = {
  a: { pick: ["q", "w", "e", "r"], lock: " ", lockLabel: "Space" },
  b: { pick: ["u", "i", "o", "p"], lock: "Enter", lockLabel: "Enter" },
};
const SOLO_EXTRA_PICKS = ["1", "2", "3", "4"];

/** React glue for the engine: owns the clock, the ticker and the keyboard. */
export function useMatch(config: MatchConfig) {
  const [state, dispatch] = useReducer(matchReducer, config, createMatch);
  const [now, setNow] = useState(() => Date.now());

  const running = (state.phase === "question" || state.phase === "countdown") && state.pausedAt === null;
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      dispatch({ type: "TICK", now: t });
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  const actions = useMemo(
    () => ({
      start: () => dispatch({ type: "START", now: Date.now() }),
      pick: (side: Side, index: number) => dispatch({ type: "PICK", side, index }),
      answer: (side: Side, value: number | string) => dispatch({ type: "ANSWER", side, value, now: Date.now() }),
      next: () => dispatch({ type: "NEXT", now: Date.now() }),
      close: () => dispatch({ type: "CLOSE", now: Date.now() }),
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
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const s = stateRef.current;
      if (s.phase !== "question" || s.pausedAt !== null) return;
      if (currentRound(s).answer.type !== "mcq") return;

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const solo = s.config.mode === "solo";
      const sides: Side[] = solo ? ["a"] : ["a", "b"];

      for (const side of sides) {
        // Solo players may use any of the pick keys and either lock key.
        const picks = solo ? [KEYS.a.pick, KEYS.b.pick, SOLO_EXTRA_PICKS] : [KEYS[side].pick];
        for (const set of picks) {
          const index = set.indexOf(key);
          if (index >= 0) {
            actions.pick(side, index);
            return;
          }
        }
        const isLock = key === KEYS[side].lock || (solo && key === KEYS.b.lock);
        if (isLock) {
          // Stop Space/Enter also "clicking" whatever button has focus.
          event.preventDefault();
          const picked = s.teams[side].picked;
          if (picked !== null && !s.teams[side].locked) actions.answer(side, picked);
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
    state.phase === "question"
      ? Math.max(0, Math.min(1, (state.deadline - clock) / timeLimitMs(state)))
      : state.phase === "ready" || state.phase === "countdown"
        ? 1
        : 0;
  const secondsLeft = state.phase === "question" ? Math.max(0, Math.ceil((state.deadline - clock) / 1000)) : 0;
  const countdownLeft = state.phase === "countdown" ? Math.max(1, Math.ceil((state.countdownEndsAt - clock) / 1000)) : 0;

  return { state, actions, round: currentRound(state), timerFraction, secondsLeft, countdownLeft };
}
