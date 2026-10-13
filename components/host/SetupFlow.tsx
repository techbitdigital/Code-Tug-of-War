"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Bot, Rocket, Users } from "lucide-react";
import MatchScreen from "@/components/match/MatchScreen";
import TeamMarker from "@/components/match/TeamMarker";
import { DEFAULT_CONFIG, type MatchConfig } from "@/lib/engine";
import { motionTokens } from "@/lib/motion";
import type { Pack } from "@/lib/types";

type Mode = MatchConfig["mode"];
type Level = "easy" | "normal" | "hard";

// How the robot plays at each level (solo).
const ROBOT: Record<Level, Pick<MatchConfig, "robotAccuracy" | "robotDelayMs">> = {
  easy: { robotAccuracy: 0.5, robotDelayMs: [10_000, 18_000] },
  normal: { robotAccuracy: 0.65, robotDelayMs: [6_000, 14_000] },
  hard: { robotAccuracy: 0.85, robotDelayMs: [4_000, 9_000] },
};

const NAME_MAX = 16;
const STORAGE_KEY = "ctow.setup.v1";

interface Saved {
  teamA: string;
  teamB: string;
  player: string;
  pullsToWin: MatchConfig["pullsToWin"];
  seconds: number;
  level: Level;
}

const DEFAULTS: Saved = { teamA: "", teamB: "", player: "", pullsToWin: 3, seconds: 30, level: "normal" };

// Remembers the last setup on this device (a convenience; the game works without it).
function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}
function save(value: Saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* private mode or storage blocked: fine */
  }
}

const FOCUS_RING = "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * The host flow for one pack: choose VS Robot or VS Player, set names and match settings,
 * then play. "New setup" on the results screen comes back here with everything filled in.
 */
export default function SetupFlow({ pack }: { pack: Pack }) {
  const [screen, setScreen] = useState<"mode" | "details" | "play">("mode");
  const [mode, setMode] = useState<Mode>("group");
  const [form, setForm] = useState<Saved>(DEFAULTS);
  const [matchKey, setMatchKey] = useState(0);
  useEffect(() => setForm(loadSaved()), []);

  const update = <K extends keyof Saved>(key: K, value: Saved[K]) => setForm((f) => ({ ...f, [key]: value }));
  const clean = (name: string, fallback: string) => name.trim().slice(0, NAME_MAX) || fallback;

  if (screen === "play") {
    const config: MatchConfig = {
      ...DEFAULT_CONFIG,
      rounds: pack.rounds,
      mode,
      pullsToWin: form.pullsToWin,
      defaultTimeLimitSec: form.seconds,
      teamNames:
        mode === "solo"
          ? { a: clean(form.player, "You"), b: "Byte Bot" }
          : { a: clean(form.teamA, "Team A"), b: clean(form.teamB, "Team B") },
      ...ROBOT[form.level],
      seed: matchKey + 1,
    };
    return <MatchScreen key={matchKey} config={config} onExit={() => setScreen("details")} />;
  }

  const start = () => {
    save(form);
    setMatchKey((k) => k + 1);
    setScreen("play");
  };

  return (
    <main className="page-bg flex items-center justify-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-3xl overflow-hidden rounded-[32px] bg-surface shadow-panel">
        <header className="relative bg-gradient-to-br from-[#6D5CF6] via-[#A43BEA] to-[#EC4899] px-16 pb-8 pt-6 text-center text-white">
          {screen === "mode" ? (
            <Link
              href="/"
              aria-label="Back to packs"
              className={`absolute left-5 top-5 flex size-11 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30 ${FOCUS_RING}`}
            >
              <ArrowLeft className="size-5" strokeWidth={3} aria-hidden="true" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setScreen("mode")}
              aria-label="Back to mode"
              className={`absolute left-5 top-5 flex size-11 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30 ${FOCUS_RING}`}
            >
              <ArrowLeft className="size-5" strokeWidth={3} aria-hidden="true" />
            </button>
          )}
          <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-white/80">{pack.title}</p>
          <h1 className="mt-1 font-display text-4xl font-black">Game setup</h1>
          <p className="mt-1 text-lg font-semibold text-white/85">
            {screen === "mode" ? "Choose your mode and get ready!" : mode === "solo" ? "You against Byte Bot" : "Name your teams"}
          </p>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          {screen === "mode" ? (
            <Panel key="mode">
              <div className="grid gap-5 sm:grid-cols-2">
                <ModeCard
                  title="VS Robot"
                  subtitle="Play against Byte Bot"
                  badge="Single player"
                  tone="robot"
                  icon={<Bot className="size-10" strokeWidth={2.2} aria-hidden="true" />}
                  onClick={() => {
                    setMode("solo");
                    setScreen("details");
                  }}
                />
                <ModeCard
                  title="VS Player"
                  subtitle="Two teams, one screen"
                  badge="Classroom"
                  tone="teams"
                  icon={<Users className="size-10" strokeWidth={2.2} aria-hidden="true" />}
                  onClick={() => {
                    setMode("group");
                    setScreen("details");
                  }}
                />
              </div>
              <p className="text-center text-sm font-bold text-ink-muted">
                {pack.rounds.length} questions · about {pack.estMinutes} minutes
              </p>
            </Panel>
          ) : (
            <Panel key="details">
              <form
                className="flex flex-col gap-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  start();
                }}
              >
                {mode === "group" ? (
                  <>
                    <NameField side="a" label="Team 1 name" placeholder="Team A" value={form.teamA} onChange={(v) => update("teamA", v)} autoFocus />
                    <NameField side="b" label="Team 2 name" placeholder="Team B" value={form.teamB} onChange={(v) => update("teamB", v)} />
                  </>
                ) : (
                  <>
                    <NameField side="a" label="Your name" placeholder="You" value={form.player} onChange={(v) => update("player", v)} autoFocus />
                    <Choice
                      label="Robot level"
                      value={form.level}
                      onChange={(v) => update("level", v)}
                      options={[
                        { value: "easy", label: "Easy", hint: "Slow, often wrong" },
                        { value: "normal", label: "Normal", hint: "A fair fight" },
                        { value: "hard", label: "Hard", hint: "Fast and sharp" },
                      ]}
                    />
                  </>
                )}

                <Choice
                  label="Match length"
                  value={form.pullsToWin}
                  onChange={(v) => update("pullsToWin", v)}
                  options={[
                    { value: 3, label: "3 steps", hint: "Quick" },
                    { value: 5, label: "5 steps", hint: "Standard" },
                    { value: 7, label: "7 steps", hint: "Long" },
                  ]}
                  note={`Drag the rope this many steps your way to win early. Otherwise, whoever leads after question ${pack.rounds.length} wins.`}
                />
                <Choice
                  label="Time per question"
                  value={form.seconds}
                  onChange={(v) => update("seconds", v)}
                  options={[
                    { value: 20, label: "20s" },
                    { value: 30, label: "30s" },
                    { value: 45, label: "45s" },
                    { value: 60, label: "60s" },
                  ]}
                />

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setScreen("mode")}
                    className={`h-16 w-1/3 rounded-2xl border-2 border-line bg-arena font-display text-xl font-black text-ink shadow-key transition-[transform,box-shadow] active:translate-y-[3px] active:shadow-none ${FOCUS_RING}`}
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    className={`flex h-16 flex-1 items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-[#22C55E] to-[#059669] font-display text-2xl font-black text-white shadow-[0_6px_0_#047857] transition-[transform,box-shadow] active:translate-y-[5px] active:shadow-none ${FOCUS_RING}`}
                  >
                    <Rocket className="size-6" strokeWidth={2.5} aria-hidden="true" /> Start game
                  </button>
                </div>
              </form>
            </Panel>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function Panel({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduced ? undefined : { opacity: 0, x: -24 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-6 bg-arena/50 p-6 sm:p-8"
    >
      {children}
    </motion.div>
  );
}

function ModeCard({
  title,
  subtitle,
  badge,
  icon,
  tone,
  onClick,
}: {
  title: string;
  subtitle: string;
  badge: string;
  icon: ReactNode;
  tone: "robot" | "teams";
  onClick: () => void;
}) {
  const t =
    tone === "robot"
      ? { tile: "from-team-a-bright to-[#4F46E5]", ring: "hover:border-team-a", badge: "bg-team-a-soft text-team-a" }
      : { tile: "from-team-b-bright to-[#DB2777]", ring: "hover:border-team-b", badge: "bg-team-b-soft text-team-b" };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-3 overflow-hidden rounded-[24px] border-2 border-line bg-surface px-6 pb-8 pt-10 text-center shadow-panel transition-[transform,border-color] hover:-translate-y-1 ${t.ring} ${FOCUS_RING}`}
    >
      <span className={`flex size-24 items-center justify-center rounded-[22px] bg-gradient-to-br text-white shadow-panel transition-transform group-hover:rotate-[-4deg] ${t.tile}`}>
        {icon}
      </span>
      <span className="font-display text-3xl font-black text-ink">{title}</span>
      <span className="text-lg font-semibold text-ink-muted">{subtitle}</span>
      <span className={`rounded-full px-4 py-1 text-base font-extrabold ${t.badge}`}>{badge}</span>
    </button>
  );
}

function NameField({
  side,
  label,
  placeholder,
  value,
  onChange,
  autoFocus,
}: {
  side: "a" | "b";
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center gap-2 font-display text-lg font-black text-ink">
        <TeamMarker side={side} size={18} /> {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={NAME_MAX}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className={`h-16 rounded-2xl border-2 border-line bg-surface px-5 text-2xl font-bold text-ink shadow-[inset_0_2px_4px_rgba(27,31,59,0.05)] placeholder:text-ink-muted/50 ${
          side === "a" ? "focus:border-team-a" : "focus:border-team-b"
        } focus:outline-none`}
      />
    </label>
  );
}

function Choice<T extends string | number>({
  label,
  value,
  onChange,
  options,
  note,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; hint?: string }[];
  note?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl border-2 border-line bg-surface p-4">
      <legend className="sr-only">{label}</legend>
      <p aria-hidden="true" className="text-sm font-black uppercase tracking-[0.08em] text-ink">
        {label}
      </p>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <label
              key={String(o.value)}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 px-2 py-3 text-center transition-colors has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
                on ? "border-accent bg-accent text-white shadow-[0_4px_0_#5B21B6]" : "border-line bg-surface text-ink hover:border-accent/50"
              }`}
            >
              <input type="radio" name={label} className="sr-only" checked={on} onChange={() => onChange(o.value)} />
              <span className="font-display text-lg font-black">{o.label}</span>
              {o.hint && <span className={`text-xs font-bold ${on ? "text-white/80" : "text-ink-muted"}`}>{o.hint}</span>}
            </label>
          );
        })}
      </div>
      {note && <p className="text-sm font-semibold text-ink-muted">{note}</p>}
    </fieldset>
  );
}
