export type Layer = "runtime" | "os" | "network" | "system-design";

export interface StationRef {
  id: string;
  title: string;
  layer: Layer;
}

export interface StackEntry {
  name: string;
  value: string;
  // refId will be added in Phase 3 when Arrays & Objects needs
  // a stack entry to point at a shared heap value instead of
  // owning its own copy.
}

export interface Snapshot {
  highlightLine: number;
  stack: StackEntry[];
  note?: string;
}

export interface Question {
  prompt: string;
  options: string[];
  correctIndex: number;
  revealSnapshot: Snapshot;
}

export interface Round {
  id: string;
  stationId: string;
  title: string;
  code: string;
  snapshots: Snapshot[];
  question: Question;
}
