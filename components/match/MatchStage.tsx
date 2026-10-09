import type { ReactNode } from "react";

interface MatchStageProps {
  topBar: ReactNode;
  question: ReactNode;
  rope: ReactNode;
  teamA: ReactNode;
  teamB: ReactNode;
  /**
   * Solo on a phone: show only the player's panel under 768px and render
   * `mobileOpponent` beside the rope instead of Team B's panel.
   */
  soloPhone?: boolean;
  mobileOpponent?: ReactNode;
  /** Covers the question area (round result, and the reveal in Step 5). */
  questionOverlay?: ReactNode;
  /** Covers the whole stage (ready, paused, results). */
  overlay?: ReactNode;
}

// Regions are percentages of the 1280x720 reference layout:
//   top bar   32,12    1216x48
//   team A    32,72    300x624         team B   948,72  300x624
//   question  352,72   576x350         arena    352,440 576x256
// Team columns sit at the sides like a real tug of war; the shared question and
// the rope sit between them. Under 768px wide the regions stack in a column.
export default function MatchStage({
  topBar,
  question,
  rope,
  teamA,
  teamB,
  soloPhone = false,
  mobileOpponent,
  questionOverlay,
  overlay,
}: MatchStageProps) {
  return (
    <div className="match-shell">
      <div className="match-container">
        <div className="match-stage flex flex-col gap-[var(--gap)] p-[var(--pad)] @3xl:absolute @3xl:inset-0 @3xl:block @3xl:p-0">
          <div className="@3xl:absolute @3xl:left-[2.5%] @3xl:top-[1.667%] @3xl:w-[95%]">{topBar}</div>

          <div className="relative z-10 @3xl:absolute @3xl:left-[27.5%] @3xl:top-[10%] @3xl:h-[48.611%] @3xl:w-[45%]">
            {question}
            {questionOverlay}
          </div>

          <div className="@3xl:absolute @3xl:left-[27.5%] @3xl:top-[61.111%] @3xl:h-[35.556%] @3xl:w-[45%]">
            {rope}
          </div>

          {soloPhone && mobileOpponent && (
            <div className="flex items-center justify-end gap-2 text-[length:var(--fs-ui)] font-bold @3xl:hidden">
              {mobileOpponent}
            </div>
          )}

          <div className="@3xl:absolute @3xl:left-[2.5%] @3xl:top-[10%] @3xl:h-[86.667%] @3xl:w-[23.4375%]">
            {teamA}
          </div>

          <div
            className={`@3xl:absolute @3xl:left-[74.0625%] @3xl:top-[10%] @3xl:h-[86.667%] @3xl:w-[23.4375%] ${
              soloPhone ? "hidden @3xl:block" : ""
            }`}
          >
            {teamB}
          </div>

          {overlay}
        </div>
      </div>
    </div>
  );
}
