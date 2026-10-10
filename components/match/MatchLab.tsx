"use client";

import { useState } from "react";
import { DEFAULT_CONFIG, type MatchConfig } from "@/lib/engine";
import type { Round } from "@/lib/types";
import MatchScreen from "./MatchScreen";

// Dev page: a real, engine-driven match plus a panel to change the setup and play host.
// The proper host flow (pick a pack, name teams, choose a mode) arrives in Step 6.
export default function MatchLab({ rounds }: { rounds: Round[] }) {
  const [pullsToWin, setPullsToWin] = useState<MatchConfig["pullsToWin"]>(DEFAULT_CONFIG.pullsToWin);
  const [mode, setMode] = useState<MatchConfig["mode"]>("group");
  const [timeLimit, setTimeLimit] = useState(30);
  const [countdown, setCountdown] = useState(true);
  const [typed, setTyped] = useState(false);
  const [seed, setSeed] = useState(1);

  // Typed answers are solo-only (agreed amendment): convert MCQ rounds to text for testing.
  const playRounds: Round[] =
    typed && mode === "solo"
      ? rounds.map((r) =>
          r.answer.type === "mcq"
            ? { ...r, answer: { type: "text", accept: [r.answer.options[r.answer.correctIndex]] } }
            : r,
        )
      : rounds;

  const config: MatchConfig = {
    ...DEFAULT_CONFIG,
    rounds: playRounds,
    pullsToWin,
    mode,
    teamNames: mode === "solo" ? { a: "You", b: "Robot" } : { a: "Cohort A", b: "Cohort B" },
    defaultTimeLimitSec: timeLimit,
    countdownMs: countdown ? 3000 : 0,
    seed,
  };
  // Changing the setup starts a fresh match.
  const key = JSON.stringify({ pullsToWin, mode, timeLimit, countdown, typed, seed });

  return (
    <MatchScreen key={key} config={config}>
      {({ state, actions }) => (
        <details className="fixed bottom-2 left-1/2 z-50 w-72 -translate-x-1/2 rounded-2xl bg-surface text-sm shadow-panel">
          <summary className="cursor-pointer select-none px-3 py-1.5 font-semibold">
            Dev controls · {state.phase}
          </summary>
          <div className="flex flex-col gap-2 border-t border-line p-3">
            <div className="grid grid-cols-3 gap-2">
              <button type="button" className="rounded-lg border border-line px-2 py-1 font-bold" onClick={actions.close}>
                Reveal now
              </button>
              <button
                type="button"
                className="rounded-lg border border-line px-2 py-1 font-bold"
                onClick={state.pausedAt === null ? actions.pause : actions.resume}
              >
                {state.pausedAt === null ? "Pause" : "Resume"}
              </button>
              <button type="button" className="rounded-lg border border-line px-2 py-1 font-bold" onClick={actions.restart}>
                Restart
              </button>
            </div>
            <label className="flex items-center justify-between gap-2">
              Mode
              <select value={mode} onChange={(e) => setMode(e.target.value as MatchConfig["mode"])} className="rounded border border-line p-1">
                <option value="group">Group (2 teams)</option>
                <option value="solo">Solo vs robot</option>
              </select>
            </label>
            <label className="flex items-center justify-between gap-2">
              Pulls to win
              <select
                value={pullsToWin}
                onChange={(e) => setPullsToWin(Number(e.target.value) as MatchConfig["pullsToWin"])}
                className="rounded border border-line p-1"
              >
                {[3, 5, 7].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center justify-between gap-2">
              Seconds per question
              <input type="number" min={5} max={120} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value) || 30)} className="w-16 rounded border border-line p-1" />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={countdown} onChange={(e) => setCountdown(e.target.checked)} />
              3-2-1 countdown
            </label>
            <label className="flex items-center justify-between gap-2">
              Robot seed
              <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 1)} className="w-16 rounded border border-line p-1" />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={typed} disabled={mode !== "solo"} onChange={(e) => setTyped(e.target.checked)} />
              Typed answers (solo only)
            </label>
            <p className="text-ink-muted">
              Rope {state.rope} · round {state.roundIndex + 1}/{state.config.rounds.length}
              {state.robot ? ` · robot locks in at +${Math.round((state.robot.at - state.questionStartedAt) / 1000)}s (${state.robot.correct ? "right" : "wrong"})` : ""}
            </p>
          </div>
        </details>
      )}
    </MatchScreen>
  );
}
