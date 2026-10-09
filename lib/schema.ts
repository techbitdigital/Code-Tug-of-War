import { z } from "zod";

export const segmentIdSchema = z.enum([
  "bootcamp",
  "school",
  "church",
  "corporate",
  "individual",
  "general",
]);

const memoryEntrySchema = z.object({
  name: z.string().min(1),
  value: z.string(),
  changed: z.boolean().optional(),
});

const revealFrameSchema = z.object({
  line: z.number().int().min(0).optional(), // 0-indexed into code.lines
  layer: z.enum(["code", "runtime", "memory", "output"]),
  memory: z.array(memoryEntrySchema).optional(),
  stack: z.array(z.string()).optional(), // top first
  output: z.string().optional(),
  say: z.string().min(1),
});

const codeSchema = z.object({
  lang: z.enum(["js", "py", "html", "sql"]),
  lines: z.array(z.string()).min(1),
  focusLine: z.number().int().min(0).optional(), // 0-indexed
});

const answerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("mcq"),
    options: z.array(z.string().min(1)).min(2).max(4),
    correctIndex: z.number().int().min(0),
  }),
  z.object({
    type: z.literal("text"),
    accept: z.array(z.string().min(1)).min(1),
    caseSensitive: z.boolean().optional(),
  }),
]);

const roundSchema = z
  .object({
    id: z.string().min(1),
    concept: z.string().min(1),
    prompt: z.string().min(1),
    code: codeSchema.optional(),
    answer: answerSchema,
    reveal: z.array(revealFrameSchema).min(1).max(6),
    timeLimitSec: z.number().int().positive().optional(),
  })
  .superRefine((round, ctx) => {
    const lastLine = round.code ? round.code.lines.length - 1 : -1;

    if (
      round.answer.type === "mcq" &&
      round.answer.correctIndex >= round.answer.options.length
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["answer", "correctIndex"],
        message: `correctIndex ${round.answer.correctIndex} is out of range for ${round.answer.options.length} options`,
      });
    }

    if (round.code?.focusLine !== undefined && round.code.focusLine > lastLine) {
      ctx.addIssue({
        code: "custom",
        path: ["code", "focusLine"],
        message: `focusLine ${round.code.focusLine} is past the last code line (${lastLine})`,
      });
    }

    round.reveal.forEach((frame, i) => {
      if (frame.line === undefined) return;
      if (!round.code) {
        ctx.addIssue({
          code: "custom",
          path: ["reveal", i, "line"],
          message: "frame highlights a line but the round has no code",
        });
      } else if (frame.line > lastLine) {
        ctx.addIssue({
          code: "custom",
          path: ["reveal", i, "line"],
          message: `line ${frame.line} is past the last code line (${lastLine}). Lines are 0-indexed.`,
        });
      }
    });
  });

export const packSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    segment: z.array(segmentIdSchema).min(1),
    track: z.enum(["beginner", "mid", "junior"]),
    estMinutes: z.number().int().positive(),
    rounds: z.array(roundSchema).min(1),
  })
  .superRefine((pack, ctx) => {
    const seen = new Set<string>();
    pack.rounds.forEach((round, i) => {
      if (seen.has(round.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["rounds", i, "id"],
          message: `duplicate round id "${round.id}"`,
        });
      }
      seen.add(round.id);
    });
  });

export type SegmentId = z.infer<typeof segmentIdSchema>;
export type RevealFrame = z.infer<typeof revealFrameSchema>;
export type CodeBlock = z.infer<typeof codeSchema>;
export type Answer = z.infer<typeof answerSchema>;
export type Round = z.infer<typeof roundSchema>;
export type Pack = z.infer<typeof packSchema>;

/** Parse and validate raw JSON. Throws with one readable line per problem. */
export function parsePack(data: unknown): Pack {
  const result = packSchema.safeParse(data);
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  ${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`
    );
    throw new Error(lines.join("\n"));
  }
  return result.data;
}