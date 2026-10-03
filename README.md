# Code-Tug-of-War
Code Tug of War — Phase 1 Prototype  Proves the core loop: watch a line of code execute, predict what happens next, see the reveal.
# Code Tug of War — Phase 1 Prototype

Proves the core loop: watch a line of code execute, predict what happens next, see the reveal.

## Setup

```
npm install
npm run dev
```

Visit http://localhost:3000, pick a round.

## What's here
- `lib/types.ts` — the Round / Snapshot / Question schema
- `data/rounds/*.json` — three hand-authored rounds (Variables, Loops, Functions)
- `components/RoundPlayer.tsx` — the watch → predict → reveal state machine
- `app/round/[id]/page.tsx` — plays a round by id

## Not in Phase 1 yet 
- Map screen / unlock progress (Phase 2)
- Heap-aware snapshots for Arrays & Objects (Phase 3)
- console.log / OS handoff lane (Phase 4)
- Multiplayer via Colyseus (Phase 5)
