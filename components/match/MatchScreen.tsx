"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import Reveal from "@/components/reveal/Reveal";
import { correctAnswerText, ropeDecided, type MatchConfig, type RoundResult, type Side } from "@/lib/engine";
import type { Round } from "@/lib/types";
import { KEYS, useMatch } from "@/lib/useMatch";
import MatchStage from "./MatchStage";
import {
  AnswersSummary,
  Countdown,
  headlineFor,
  PausedCard,
  ReadyCard,
  ReplaySheet,
  ResultCard,
  ResultStrip,
  RoundBanner,
} from "./Overlays";
import QuestionCard from "./QuestionCard";
import RopeTrack from "./RopeTrack";
import TeamMarker from "./TeamMarker";
import TeamPanel, { type PanelStatus } from "./TeamPanel";
import TopBar from "./TopBar";

type Match = ReturnType<typeof useMatch>;

interface MatchScreenProps {
  config: MatchConfig;
  /** Optional extra UI with access to the live match (the dev page uses it for host controls). */
  children?: (match: Match) => ReactNode;
}

// How long the "who pulled" moment plays before the reveal opens.
const TUG_MS = 2600;

// The playable match: engine state in, stage out. Everything visual lives in the
// components it composes; this file only wires them to the engine.
export default function MatchScreen({ config, children }: MatchScreenProps) {
  const match = useMatch(config);
  const { state, actions, round, timerFraction, secondsLeft, countdownLeft } = match;
  const [soundOn, setSoundOn] = useState(true);
  const [replayIndex, setReplayIndex] = useState<number | null>(null);

  const { phase, teams, rope, lastResult } = state;
  const names = config.teamNames;
  const solo = config.mode === "solo";
  const paused = state.pausedAt !== null;
  const concealed = phase === "ready" || phase === "countdown";
  const matchOver = ropeDecided(state) || state.roundIndex >= config.rounds.length - 1;

  // After a round ends, let the tug play out before the reveal covers the stage.
  const reduced = useReducedMotion() ?? false;
  const [revealOpen, setRevealOpen] = useState(false);
  useEffect(() => {
    if (phase !== "reveal") {
      setRevealOpen(false);
      return;
    }
    const t = setTimeout(() => setRevealOpen(true), reduced ? 1200 : TUG_MS);
    return () => clearTimeout(t);
  }, [phase, state.roundIndex, reduced]);

  const statusFor = (side: Side): PanelStatus => {
    if (concealed) return "hidden";
    if (phase === "reveal" || phase === "over") return "reveal";
    if (paused) return "idle";
    return teams[side].locked ? "locked-in" : "open";
  };

  const panel = (side: Side) => {
    const other: Side = side === "a" ? "b" : "a";
    const locked = teams[side].locked;
    return (
      <TeamPanel
        side={side}
        name={names[side]}
        answer={round.answer}
        pulls={Math.max(0, side === "a" ? -rope : rope)}
        pullsToWin={config.pullsToWin}
        status={statusFor(side)}
        picked={teams[side].picked}
        onPick={(i) => actions.pick(side, i)}
        onAnswer={(v) => actions.answer(side, v)}
        keyHints={solo && side === "b" ? undefined : solo ? { pick: ["1", "2", "3", "4"], lock: "Space" } : { pick: KEYS[side].pick, lock: KEYS[side].lockLabel }}
        lockedSeconds={locked ? locked.timeMs / 1000 : undefined}
        opponentName={teams[other].locked ? undefined : names[other]}
        revealValue={lastResult?.answers[side]?.value ?? null}
        robot={solo && side === "b"}
      />
    );
  };

  const overlay =
    phase === "ready" ? (
      <ReadyCard state={state} onStart={actions.start} />
    ) : phase === "countdown" ? (
      paused ? <PausedCard onResume={actions.resume} /> : <Countdown seconds={countdownLeft} />
    ) : phase === "over" ? (
      replayIndex === null ? (
        <ResultCard state={state} onRestart={actions.restart} onReplay={setReplayIndex} />
      ) : (
        <ReplaySheet>
          <RoundReveal
            round={config.rounds[replayIndex]}
            result={state.history[replayIndex]}
            names={names}
            finishLabel="Back to results"
            onFinish={() => setReplayIndex(null)}
          />
        </ReplaySheet>
      )
    ) : paused ? (
      <PausedCard onResume={actions.resume} />
    ) : null;

  return (
    <>
      <MatchStage
        soloPhone={solo}
        topBar={
          <TopBar
            round={state.roundIndex + 1}
            totalRounds={config.rounds.length}
            concept={concealed ? undefined : round.concept}
            timerFraction={timerFraction}
            timerLow={phase === "question" && secondsLeft <= 5}
            secondsLeft={secondsLeft}
            soundOn={soundOn}
            onToggleSound={() => setSoundOn((on) => !on)}
            paused={paused}
            onPause={phase === "question" || phase === "countdown" ? (paused ? actions.resume : actions.pause) : undefined}
          />
        }
        question={<QuestionCard round={round} concealed={concealed} />}
        questionOverlay={
          phase === "reveal" && lastResult && !revealOpen ? (
            <RoundBanner result={lastResult} round={round} names={names} onOpenReveal={() => setRevealOpen(true)} />
          ) : null
        }
        rope={<RopeTrack ropePosition={rope} pullsToWin={config.pullsToWin} />}
        mobileOpponent={
          <>
            <TeamMarker side="b" size={20} />
            <span>vs {names.b}</span>
          </>
        }
        teamA={panel("a")}
        teamB={panel("b")}
        sheet={
          phase === "reveal" && lastResult && revealOpen ? (
            <RoundReveal
              round={round}
              result={lastResult}
              names={names}
              finishLabel={matchOver ? "See results" : "Next question"}
              onFinish={actions.next}
            />
          ) : null
        }
        overlay={overlay}
      />
      {children?.(match)}
    </>
  );
}

/** The reveal for one round, with the result as its header and the answers as its last step. */
function RoundReveal({
  round,
  result,
  names,
  finishLabel,
  onFinish,
}: {
  round: Round;
  result: RoundResult;
  names: Record<Side, string>;
  finishLabel: string;
  onFinish: () => void;
}) {
  return (
    <Reveal
      key={round.id}
      frames={round.reveal}
      code={round.code}
      header={
        <ResultStrip result={result} headline={headlineFor(result, names)}>
          <span className="rounded-full bg-white px-3 py-0.5 font-mono text-[length:var(--fs-ui)] font-bold text-correct">
            Answer: {correctAnswerText(round.answer)}
          </span>
        </ResultStrip>
      }
      epilogue={{ title: "Who said what", content: <AnswersSummary result={result} round={round} names={names} /> }}
      finishLabel={finishLabel}
      tone={result.winner ?? "accent"}
      onFinish={onFinish}
    />
  );
}
