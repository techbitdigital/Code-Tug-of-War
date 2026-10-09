// "Text scaled to fit" for the question card on the 1280x720 stage.
// All constants are in px of the 1280x720 reference layout (brief section 5).
const INNER_W = 536; // card 576 - 2*20 padding
const INNER_H = 310; // card 350 - 2*20 padding
const GAP = 12;
const CODE_PAD_Y = 24;
const PROMPT_BASE = 32;
const CODE_BASE = 28;
const PROMPT_LH = 1.1;
const CODE_LH = 1.4;
const CHAR_W = 0.6; // average advance in em (JetBrains Mono is 0.6)
const PROMPT_CHAR_W = 0.55; // Nunito Black, average advance in em
const GUTTER_EM = 2.2;
const BAR_PX = 4;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export interface QuestionFit {
  /** Multiplier on the base prompt size (1 = 32px on the stage). */
  prompt: number;
  /** Multiplier on the base code size for width (1 = 28px on the stage). */
  codeW: number;
  /** Multiplier on the base code size for height. */
  codeH: number;
}

export function fitQuestion(prompt: string, lines: string[] | undefined): QuestionFit {
  // Prompt: full size for up to two lines, then shrinks (to a 60% floor).
  const promptFit = clamp(
    (2 * INNER_W) / (PROMPT_CHAR_W * PROMPT_BASE * Math.max(1, prompt.length)),
    0.6,
    1,
  );
  if (!lines || lines.length === 0) return { prompt: promptFit, codeW: 1, codeH: 1 };

  const promptSize = PROMPT_BASE * promptFit;
  const promptRows = Math.ceil((prompt.length * PROMPT_CHAR_W * promptSize) / INNER_W);
  const promptH = promptRows * promptSize * PROMPT_LH;

  const maxLen = Math.max(1, ...lines.map((l) => l.length));
  const codeW = Math.min(1, (INNER_W - BAR_PX - 12 - 8) / (CODE_BASE * (CHAR_W * maxLen + GUTTER_EM)));
  const codeH = clamp(
    (INNER_H - promptH - GAP - CODE_PAD_Y) / (lines.length * CODE_LH * CODE_BASE),
    0.35,
    1,
  );
  return { prompt: promptFit, codeW, codeH };
}
