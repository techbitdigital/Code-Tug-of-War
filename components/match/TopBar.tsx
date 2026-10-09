import { CircleHelp, Pause, Timer, Volume2, VolumeX } from "lucide-react";

interface TopBarProps {
  round: number;
  totalRounds: number;
  /** Short concept label for the round, e.g. "let" or "for loop". */
  concept?: string;
  /** 1 = full, 0 = out of time. */
  timerFraction: number;
  /** True in the last 5 seconds: the bar turns red. */
  timerLow?: boolean;
  soundOn: boolean;
  onToggleSound?: () => void;
  onHelp?: () => void;
  onPause?: () => void;
}

const PILL =
  "flex h-[var(--bar-h)] items-center gap-[calc(var(--gap)*0.6)] whitespace-nowrap rounded-full bg-surface px-[calc(var(--gap)*1.4)] font-display text-[length:var(--fs-ui)] font-extrabold text-ink shadow-panel";

const ICON_BUTTON =
  "flex size-[var(--bar-btn)] items-center justify-center rounded-full bg-surface text-ink shadow-panel transition-transform hover:-translate-y-px active:scale-[0.94] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus";

export default function TopBar({
  round,
  totalRounds,
  concept,
  timerFraction,
  timerLow = false,
  soundOn,
  onToggleSound,
  onHelp,
  onPause,
}: TopBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, timerFraction)) * 100);

  return (
    <header className="flex items-center justify-between gap-[var(--gap)]">
      <div className="flex min-w-0 items-center gap-[var(--gap)]">
        <div className={PILL}>
          Round {round}
          <span className="text-ink-muted">/ {totalRounds}</span>
        </div>
        {concept && (
          <div className={`${PILL} hidden bg-accent/10! text-accent shadow-none! @3xl:flex`}>
            <span className="font-mono">{concept}</span>
          </div>
        )}
      </div>

      <div className={`${PILL} gap-[var(--gap)]`}>
        <Timer className={`size-[1.15em] ${timerLow ? "text-wrong" : "text-ink-muted"}`} aria-hidden="true" />
        <div
          role="progressbar"
          aria-label="Time left"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="h-[var(--timer-h)] w-[calc(var(--timer-w)*0.6)] overflow-hidden rounded-full bg-line @3xl:w-[var(--timer-w)]"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${timerLow ? "bg-wrong" : "bg-focus"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-[calc(var(--gap)*0.8)]">
        <button
          type="button"
          className={ICON_BUTTON}
          onClick={onToggleSound}
          aria-label={soundOn ? "Turn sound off" : "Turn sound on"}
          aria-pressed={soundOn}
        >
          {soundOn ? (
            <Volume2 className="size-[45%]" strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <VolumeX className="size-[45%]" strokeWidth={2.5} aria-hidden="true" />
          )}
        </button>
        <button type="button" className={`${ICON_BUTTON} hidden @3xl:flex`} onClick={onHelp} aria-label="Help">
          <CircleHelp className="size-[45%]" strokeWidth={2.5} aria-hidden="true" />
        </button>
        <button type="button" className={ICON_BUTTON} onClick={onPause} aria-label="Pause">
          <Pause className="size-[45%]" strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
