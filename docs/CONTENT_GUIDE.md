# Writing rounds: the reveal standard

Every round is written to the same level of detail, so learners always know what one
"step" means. `npm run validate:packs` checks most of this for you.

## The steps

1. **Before running (always step 1, no `line`).** The engine reads the whole program first.
   - Every `let`/`const` gets a box marked `"uninitialized": true`. It isn't usable yet: the temporal dead zone.
   - Every `function` declaration is stored whole, e.g. `{ "name": "double", "value": "ƒ double(n)" }`.
   - Loop variables (`for (let i ...)`) do **not** exist yet. They belong to the loop.
2. **One step per statement the engine runs**, in the order it runs them.
   - `let x = 2;` is one step: work out the value, then store it.
   - A `for` header gets its own step **every time it runs**, highlighted on the header's line:
     first `i = 0` and the check, then each `i++` and the check. The last of these is the one where the check is false.
   - The loop body is its own step on the body's line.
   - Calling a function is a step on the call line. The function's lines run inside the new frame. The return lands back on the call line.
3. **Output** steps use `"layer": "output"` and `"output": "..."`.

## Each frame

| Field | Rule |
| --- | --- |
| `line` | 0-indexed. Leave it out only on step 1. |
| `layer` | The deepest layer this step changes: `code`, `runtime`, `memory` or `output`. |
| `eval` | What the engine works out, one stage per item: `["score + 2", "0 + 2", "2"]`. Needed on every runtime step. |
| `memory` | The **full** picture of every box at this step. Mark `"changed": true` only on boxes whose value is new. |
| `scope` | `"global"` (default), the call (`"double(5)"`), or `"loop"`. When a frame pops or a loop ends, its boxes disappear from the next step. |
| `stack` | Top first, e.g. `["double(5)", "global"]`, on any step inside a call. |
| `say` | One or two short sentences. If it names a value ("score becomes 4"), Memory must show the same value. The validator fails the pack otherwise. |

## Answers

- Multiple choice is 2–4 options of 18 characters or fewer, plus a `why` for each one, in the same order. The correct one can be `""`.
  A good "why not" names the misconception ("'24' with quotes is a string").
- Keep prompts to 60 characters and code to 5 lines or fewer, so they stay readable on a projector.
