# Project Euler in RiX

Worked solutions to [Project Euler](https://projecteuler.net) problems,
written as RiX notebooks. Each note states the problem, tries small cases,
builds a general solution, and asserts the final answer.

This folder is a RiX Notebook project: open it in RiX Notebook (`rix-nb`),
or open any note under `Problems/` on its own. Notes are Markdown with
fenced `rix edu` cells (code and results shown) and `@{...}` inline values.

## Running from the command line

```sh
bun tools/run.mjs                      # every note, statement by statement
bun tools/run.mjs --quiet              # one PASS/FAIL line per note
bun tools/run.mjs Problems/003-*.md    # selected notes
```

The runner executes notes with the same engine RiX Notebook uses
(`rix-nb/webview/source/notebook-web/rix-engine.js`), so it expects this
folder to sit beside `rix-nb/` in the ratmath repository. It exits nonzero
if any statement errors. Answers are guarded by `##@ == value` assertion
comments inside the notes, which fail the run when a value is wrong.

## Conventions

- One note per problem, named `NNN-title.md` and listed in
  `Problems/notebook.toml`.
- Sections: the problem (paraphrased, with a link), small experiments, the
  general solution, and the answer.
- The last cell binds `answer` and asserts it.
- Cells that take more than a second or so carry the `expensive` flag.

## RiX habits these notes rely on

- Use `:=` for loop counters and working copies. Plain `=` aliases the
  right-hand name, so `b = hi; b -= 1` also decrements `hi`.
- `==` on two arrays or tuples tests identity, not contents. Compare lists
  through `.Join(" ")` or by filtering for mismatches.
- `.IRANGE` results are read-only until `list._mutable = 1`.
- Loops stop at 10000 iterations by default; `{@::@ ... }` lifts the cap.
- Write `*` between names: `k * m * (m + 1)`, since `m (m + 1)` is a call.
- `|; predicate` in a generator keeps the value that triggered the stop.

## Status

| Problem | Title | Run time |
|---|---|---|
| 1 | Multiples of 3 or 5 | instant |
| 2 | Even Fibonacci numbers | instant |
| 3 | Largest prime factor | instant |
| 4 | Largest palindrome product | instant |
| 5 | Smallest multiple | instant |
| 6 | Sum square difference | instant |
| 7 | 10001st prime | about 3 s |
| 8 | Largest product in a series | instant |
| 9 | Special Pythagorean triplet | instant |
| 10 | Summation of primes | about 6 s |
