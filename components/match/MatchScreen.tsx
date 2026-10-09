"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { correctAnswerText, ropeDecided, type MatchConfig } from "@/lib/engine";
import { useMatch } from "@/lib/useMatch";
import MatchStage from "./MatchStage";
import Reveal from "@/components/reveal/Reveal";
import { headlineFor, PausedCard, ReadyCard, ResultCard, ResultStrip, RoundBanner } from "./Overlays";
import QuestionCard from "./QuestionCard";
import RopeTrack from "./RopeTrack";
import TeamMarker from "./TeamMarker";
import TeamPanel from "./TeamPanel";
import TopBar from "./TopBar";

type Match = ReturnType<typeof useMatch>;

interface MatchScreenProps {
  config: MatchConfig;
  /** Optional extra UI with access to the live match (the dev page uses it for host controls). */
  children?: (match: Match) => ReactNode;
}

// The playable match: engine state in, stage out. Everything visual lives in the
// components it composes; this file only wires them to the engine.
export default function MatchScreen({ config, children }: MatchScreenProps) {
  const match = useMatch(config);
  const { state, actions, round, timerFraction, secondsLeft, coolingDown } = match;
  const [soundOn, setSoundOn] = useState(true);

  const { phase, teams, rope, lastResult } = state;
  const names = config.teamNames;
  const solo = config.mode === "solo";
  const revealing = phase === "reveal" || phase === "over";
  const correctIndex = revealing && round.answer.type === "mcq" ? round.answer.correctIndex : undefined;
  const paused = state.pausedAt !== null;

  // After a round ends, let the rope finish moving before the reveal covers the stage.
  const reduced = useReducedMotion() ?? false;
  const [revealOpen, setRevealOpen] = useState(false);
  useEffect(() => {
    if (phase !== "reveal") {
      setRevealOpen(false);
      return;
    }
    const t = setTimeout(() => setRevealOpen(true), reduced ? 900 : 2200);
    return () => clearTimeout(t);
  }, [phase, state.roundIndex, reduced]);
  const matchOver = ropeDecided(state) || state.roundIndex >= config.rounds.length - 1;

  const overlay =
    phase === "ready" ? (
      <ReadyCard state={state} onStart={actions.start} />
    ) : phase === "over" ? (
      <ResultCard state={state} onRestart={actions.restart} />
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
            concept={round.concept}
            timerFraction={timerFraction}
            timerLow={phase === "question" && secondsLeft <= 5}
            secondsLeft={secondsLeft}
            soundOn={soundOn}
            onToggleSound={() => setSoundOn((on) => !on)}
            paused={paused}
            onPause={phase === "question" ? (paused ? actions.resume : actions.pause) : undefined}
          />
        }
        question={<QuestionCard round={round} />}
        questionOverlay={
          phase === "reveal" && lastResult && !revealOpen ? (
            <RoundBanner
              result={lastResult}
              names={names}
              answerText={correctAnswerText(round.answer)}
              onOpenReveal={() => setRevealOpen(true)}
            />
          ) : null
        }
        rope={<RopeTrack ropePosition={rope} pullsToWin={config.pullsToWin} />}
        mobileOpponent={
          <>
            <TeamMarker side="b" size={20} />
            <span>vs {names.b}</span>
          </>
        }
        teamA={
          <TeamPanel
            side="a"
            name={names.a}
            answer={round.answer}
            pulls={Math.max(0, -rope)}
            pullsToWin={config.pullsToWin}
            locked={phase !== "question" || paused}
            picked={teams.a.picked}
            onPick={(i) => actions.pick("a", i)}
            onAnswer={(v) => actions.answer("a", v)}
            cooling={coolingDown("a")}
            wrongCount={teams.a.wrongThisRound}
            correctIndex={correctIndex}
          />
        }
        teamB={
          <TeamPanel
            side="b"
            name={names.b}
            answer={round.answer}
            pulls={Math.max(0, rope)}
            pullsToWin={config.pullsToWin}
            locked={phase !== "question" || paused}
            picked={teams.b.picked}
            onPick={(i) => actions.pick("b", i)}
            onAnswer={(v) => actions.answer("b", v)}
            cooling={coolingDown("b")}
            wrongCount={teams.b.wrongThisRound}
            correctIndex={correctIndex}
            robot={solo}
          />
        }
        sheet={
          phase === "reveal" && lastResult && revealOpen ? (
            <Reveal
              key={round.id}
              frames={round.reveal}
              code={round.code}
              header={
                <ResultStrip result={lastResult} headline={headlineFor(lastResult, names)}>
                  <span className="rounded-full bg-white px-3 py-0.5 font-mono text-[length:var(--fs-ui)] font-bold text-correct">
                    Answer: {correctAnswerText(round.answer)}
                  </span>
                </ResultStrip>
              }
              finishLabel={matchOver ? "See results" : "Next question"}
              tone={lastResult.winner ?? "accent"}
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
