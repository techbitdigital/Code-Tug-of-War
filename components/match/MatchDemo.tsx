"use client";

import { useState } from "react";
import type { Answer, Round } from "@/lib/types";
import MatchStage from "./MatchStage";
import QuestionCard from "./QuestionCard";
import RopeTrack from "./RopeTrack";
import TeamMarker from "./TeamMarker";
import TeamPanel, { type Side } from "./TeamPanel";
import TopBar from "./TopBar";

const PULLS = [3, 5, 7] as const;
type Pulls = (typeof PULLS)[number];

interface MatchDemoProps {
  rounds: Round[];
}

function isCorrect(answer: Answer, value: number | string) {
  if (answer.type === "mcq") return value === answer.correctIndex;
  const typed = String(value).trim();
  return answer.accept.some((a) =>
    answer.caseSensitive ? a === typed : a.toLowerCase() === typed.toLowerCase(),
  );
}

// Dev harness for Steps 2-3: the match screen with knobs for everything it depends on.
// A correct PULL moves the rope so the animations can be tried by hand. The real game
// engine (Step 4) replaces this local state.
export default function MatchDemo({ rounds }: MatchDemoProps) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [pullsToWin, setPullsToWin] = useState<Pulls>(5);
  const [ropePosition, setRopePosition] = useState(0);
  const [textMode, setTextMode] = useState(false);
  const [solo, setSolo] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [timer, setTimer] = useState(0.6);
  const [last, setLast] = useState("nothing yet");

  const round = rounds[roundIdx];
  const rope = Math.max(-pullsToWin, Math.min(pullsToWin, ropePosition));
  const over = Math.abs(rope) === pullsToWin;

  // In text mode, turn the multiple-choice round into a typed-answer round.
  const answer: Answer =
    textMode && round.answer.type === "mcq"
      ? { type: "text", accept: [round.answer.options[round.answer.correctIndex]] }
      : round.answer;

  const pull = (side: Side) =>
    setRopePosition((r) => Math.max(-pullsToWin, Math.min(pullsToWin, r + (side === "a" ? -1 : 1))));

  const handle = (side: Side) => (value: number | string) => {
    const team = side === "a" ? "Team A" : "Team B";
    if (isCorrect(answer, value)) {
      pull(side);
      setLast(`${team}: ${JSON.stringify(value)} is correct, pull!`);
    } else {
      setLast(`${team}: ${JSON.stringify(value)} is wrong`);
    }
  };

  return (
    <>
      <MatchStage
        soloPhone={solo}
        topBar={
          <TopBar
            round={roundIdx + 1}
            totalRounds={rounds.length}
            concept={round.concept}
            timerFraction={timer}
            timerLow={timer < 0.17}
            soundOn={soundOn}
            onToggleSound={() => setSoundOn((on) => !on)}
          />
        }
        question={<QuestionCard round={round} />}
        rope={<RopeTrack ropePosition={rope} pullsToWin={pullsToWin} />}
        mobileOpponent={
          <>
            <TeamMarker side="b" size={20} />
            <span>vs Robot</span>
          </>
        }
        teamA={
          <TeamPanel
            side="a"
            name={solo ? "You" : "Cohort A"}
            answer={answer}
            pulls={Math.max(0, -rope)}
            pullsToWin={pullsToWin}
            locked={over}
            onAnswer={handle("a")}
          />
        }
        teamB={
          <TeamPanel
            side="b"
            name={solo ? "Robot" : "Cohort B"}
            answer={answer}
            pulls={Math.max(0, rope)}
            pullsToWin={pullsToWin}
            locked={over}
            onAnswer={handle("b")}
          />
        }
      />

      <details className="fixed bottom-2 left-1/2 z-50 w-72 -translate-x-1/2 rounded-2xl bg-surface text-sm shadow-panel">
        <summary className="cursor-pointer select-none px-3 py-1.5 font-semibold">Dev controls</summary>
        <div className="flex flex-col gap-2 border-t border-line p-3">
          <div className="grid grid-cols-3 gap-2">
            <button type="button" className="rounded-lg bg-team-a px-2 py-1 font-bold text-white" onClick={() => pull("a")}>
              A pulls
            </button>
            <button
              type="button"
              className="rounded-lg border border-line px-2 py-1 font-bold"
              onClick={() => setRopePosition(0)}
            >
              Reset
            </button>
            <button type="button" className="rounded-lg bg-team-b px-2 py-1 font-bold text-white" onClick={() => pull("b")}>
              B pulls
            </button>
          </div>
          <label className="flex flex-col gap-1">
            Round
            <select
              value={roundIdx}
              onChange={(e) => setRoundIdx(Number(e.target.value))}
              className="rounded border border-line bg-surface p-1"
            >
              {rounds.map((r, i) => (
                <option key={r.id} value={i}>
                  {i + 1}. {r.id}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Pulls to win
            <select
              value={pullsToWin}
              onChange={(e) => {
                setPullsToWin(Number(e.target.value) as Pulls);
                setRopePosition(0);
              }}
              className="rounded border border-line bg-surface p-1"
            >
              {PULLS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Rope position ({rope})
            <input
              type="range"
              min={-pullsToWin}
              max={pullsToWin}
              step={1}
              value={rope}
              onChange={(e) => setRopePosition(Number(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1">
            Timer ({Math.round(timer * 100)}%)
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={timer}
              onChange={(e) => setTimer(Number(e.target.value))}
            />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={textMode} onChange={(e) => setTextMode(e.target.checked)} />
            Typed answers
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={solo} onChange={(e) => setSolo(e.target.checked)} />
            Solo (phone shows only your panel)
          </label>
          <p className="text-ink-muted">Last input: {last}</p>
        </div>
      </details>
    </>
  );
}
