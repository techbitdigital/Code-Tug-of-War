"use client";

import { useState } from "react";
import { Round } from "@/lib/types";
import CodePanel from "./CodePanel";
import StatePanel from "./StatePanel";
import PredictPanel from "./PredictPanel";

type Phase = "watch" | "predict" | "reveal";

interface RoundPlayerProps {
  round: Round;
}

export default function RoundPlayer({ round }: RoundPlayerProps) {
  const [phase, setPhase] = useState<Phase>("watch");
  const [snapshotIndex, setSnapshotIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const currentSnapshot =
    phase === "reveal" ? round.question.revealSnapshot : round.snapshots[snapshotIndex];

  const isLastWatchSnapshot = snapshotIndex === round.snapshots.length - 1;

  function handleNext() {
    if (isLastWatchSnapshot) {
      setPhase("predict");
    } else {
      setSnapshotIndex((i) => i + 1);
    }
  }

  function handleSelect(index: number) {
    if (selected !== null) return;
    setSelected(index);
    setPhase("reveal");
  }

  function handleRestart() {
    setPhase("watch");
    setSnapshotIndex(0);
    setSelected(null);
  }

  const isCorrect = selected === round.question.correctIndex;

  return (
    <div className="flex flex-col gap-5 max-w-xl">
      <div>
        <div className="text-xs font-semibold tracking-wider text-[#8A8578] uppercase">
          {round.stationId}
        </div>
        <h1 className="text-2xl font-bold">{round.title}</h1>
      </div>

      <CodePanel code={round.code} highlightLine={currentSnapshot.highlightLine} />
      <StatePanel stack={currentSnapshot.stack} note={currentSnapshot.note} />

      {phase === "watch" && (
        <button
          type="button"
          onClick={handleNext}
          className="self-start bg-[#141413] text-[#FAF9F5] font-semibold px-5 py-2 rounded-full"
        >
          {isLastWatchSnapshot ? "I'm ready to predict" : "Next step"}
        </button>
      )}

      {phase === "predict" && (
        <PredictPanel
          question={round.question}
          selected={selected}
          answered={false}
          onSelect={handleSelect}
        />
      )}

      {phase === "reveal" && (
        <>
          <PredictPanel
            question={round.question}
            selected={selected}
            answered={true}
            onSelect={() => {}}
          />
          <div className={isCorrect ? "text-[#2F6FED] font-semibold" : "text-[#D64B3F] font-semibold"}>
            {isCorrect ? "Correct." : "Not quite — here's what actually happened."}
          </div>
          <button
            type="button"
            onClick={handleRestart}
            className="self-start border-2 border-[#E2DFD3] font-semibold px-5 py-2 rounded-full"
          >
            Replay this round
          </button>
        </>
      )}
    </div>
  );
}
