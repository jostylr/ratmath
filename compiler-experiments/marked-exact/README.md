# Mark ordinary RiX functions for exact-core JavaScript execution

`## @exact-core` marks an adjacent top-level named function. The experimental
loader compiles its actual lowered RiX body on first call and caches the code.
The ordinary loop stays in RiX source; no Fold rewrite is necessary:

```rix
## @exact-core
Horner(coefficients,x) -> {@ r=0-0,i=1;
  i<=coefficients.Len();
  r:=r*x+coefficients.Get(i),i+=1;
  ;r
};
Horner([2,3,4],5);  ## 69
```

This works only through this experiment's loader, not the production RiX runner.
It generates JavaScript, which Bun/Node can JIT; it does not emit a native binary.
Production core and RiX sources are unchanged.

## What happens at a call

RiX still defines the function, builds its original automatic symbolic spec,
selects the callable and binds arguments. The marked body then checks its inputs
and execution mode. A small compiler translates whitelisted IR into JavaScript
locals, `while` loops, comparisons and direct RatMath method calls. For example,
the Horner update becomes:

```js
r = op.add(op.multiply(r, x), op.get(coefficients, i));
```

`op.multiply` calls the current core's `r.multiply(x)` and checks its exact result;
there is no per-operation RiX registry or method lookup. This keeps Integer and
Rational arithmetic and operation order. Unlike Fold, this initial compiler also
keeps the loop counter as an exact Integer, checks Len/Get and compiles the
condition and increment. Generated source is saved in `results/generated-*.json`.

The cache holds at most 64 successful kernels, keyed by live parameters, body IR
and numeric/array argument shapes. Integer and Rational arguments share a numeric
union kernel. Mutated bodies/redefinitions cannot reuse stale code. Input arrays
are validated and privately copied on each call; the cache holds no input data.
The benchmark compiles just two kernels and reuses Horner at both input sizes.

## Explicit contract and supported subset

Like strict `.exactLoop.Fold`, the marker declares **core arithmetic and exact
comparisons**, intentionally bypassing custom RiX arithmetic/comparison operators.
It is not a transparent optimizer for arbitrary RiX behavior. Unsupported bodies
and input representations refuse execution instead of silently changing domains
or falling back. Dynamic bounds/arithmetic errors propagate once, without retry.
Ordinary argument evaluation still runs once before entering the marked body.

Supported: plain positional parameters; plain Integer/Rational values and flat,
dense eager arrays; `+ - * /`, unary minus and literal powers 0–8; exact numeric
comparisons and numeric ternaries; Array Len/Get; private numeric locals and
updates; loops with explicit final expressions; nested loops/blocks with checked
local scopes, explicit outer reads of compiled locals and copied imports.
Get requires an in-range positive Integer index; null/negative-index semantics
are outside this numeric subset. Loop conditions must be decided comparisons,
not JavaScript coercions of RiX numbers (zero is truthy in RiX).

Cell aliases (`a=b`), parameter/outer mutation, metadata-bearing numbers, custom
Array methods, subclasses, implicit/global captures, other function calls,
recursion, prep/default/rest/keyword parameters, return/break constructs, async
and streams are outside the subset. Automatic symbolic specs must remain enabled.
Active tracing/evaluator budgets refuse compiled execution. Core prototypes and
structural registry/method entries are rechecked. The normal finite loop limit is
honored, including nested loops. Defaults additionally bound array length to
65,536, total loop/lookup/comparison/arithmetic work to 1,000,000, and numeric
payloads/results to 16,384 bits. These synchronous checks do not provide worker
isolation, yielding cancellation or a fixed latency/memory guarantee. The loader
is for trusted local experiments, not adversarial JavaScript/proxies.

## Measurements

Bun 1.4.3 and Node 26.12.0, Apple M4 Pro/macOS ARM64. Median milliseconds per
complete call, including public RiX function dispatch/binding, compiled-path
checks and snapshots. All paths use the same current working-tree core/ RiX
copy as the Fold experiment; earlier arithmetic/interpreter fast paths are not
installed. Handwritten core-method JS is an additional unguarded reference in
the raw reports.

| Runtime | Case | Interpreted ms | Marked ms | Fold ms | Marked speedup |
|---|---|---:|---:|---:|---:|
| Bun | Horner, 20 Rationals | 0.10579 | 0.04825 | 0.03477 | 2.2× |
| Bun | Sum, 512 Integers | 1.22379 | 0.20132 | 0.08979 | 6.1× |
| Bun | Horner, 96 Rationals | 1.97552 | 1.23893 | 1.26742 | 1.6× |
| Bun | Horner 20, poly + stats loaded | 0.92544 | 0.04506 | 0.03069 | 20.5× |
| Bun | Sum 512, poly + stats loaded | 13.48706 | 0.19059 | 0.09185 | 70.8× |
| Node | Horner, 20 Rationals | 0.10801 | 0.06899 | 0.04989 | 1.6× |
| Node | Sum, 512 Integers | 1.44798 | 0.27128 | 0.14090 | 5.3× |
| Node | Horner, 96 Rationals | 5.91314 | 3.89755 | 3.84282 | 1.5× |
| Node | Horner 20, poly + stats loaded | 0.73775 | 0.07653 | 0.05482 | 9.6× |
| Node | Sum 512, poly + stats loaded | 11.19020 | 0.28071 | 0.13394 | 39.9× |

Three warmup batches and nine rounds with rotating path order; setup, parsing
and compilation excluded from warm timings. Every result's full exact value and
numeric class is checked outside timing. Repetition counts, all samples, source
hashes, runtime versions and correctness digests are recorded. First invocation
of each case is measured before warmup, with separate compiler time and cache
hit/build counts: later cases may reuse an earlier kernel.

Bun: actual first Horner call 1.013 ms (0.399 ms compiler); first sum 0.439 ms (0.113 ms compiler).
Node: actual first Horner call 1.119 ms (0.570 ms compiler); first sum 0.574 ms (0.091 ms compiler).

These tiny compiler timings are single observations, not distributions. Process
startup/module loading and initial session construction cost hundreds of ms and
are excluded from kernel speedups; the measured session cost is in each report.

## Findings and next experiments

- Ordinary marked loops work without Fold-specific source changes. Heavier
  Rational Horner is within roughly 3% of Fold here; arithmetic dominates.
- On cheap Integer sums the marked loop is about twice as slow as Fold. It still
  allocates exact counters/lengths and checks comparisons, indexing and work.
  A useful next compiler pass would prove bounded induction variables and lower
  just their control/index work, while retaining exact arithmetic for the result.
- Plugin context matters greatly. Loading poly and stats slows the same unmarked
  loops, while both exact-core paths remain close to their previous timings.
  This helps explain the larger speedups in the earlier Fold report, which loaded
  both plugins. Do not apply those ratios to a minimal session.
- A separate untimed dispatch probe finds that plugin loading adds Polynomial
  and CertifiedRealOracle variants to scalar arithmetic. A four-element sum
  performs 90 candidate probes before loading, 106 afterward, and zero inside
  the marked body. Some probes run RiX preparation machinery. These counts locate
  work but do not apportion its CPU cost. Guarded rejection of clearly inapplicable
  built-in/plugin numeric variants is a promising interpreter experiment, provided
  custom dispatch behavior is preserved.
- Worker execution, cancellation/accounting and a supported eligibility/version
  protocol are needed before promoting broad marked-loop execution. Keep scopes,
  effects and async orchestration in ordinary RiX around coarse numeric kernels.

## Validate and reproduce

184 marker-specific checks pass independently in Bun and Node, including mixed
numeric domains, empty inputs, comparisons, nested scopes/copied imports, update
slots, reflection, cache reuse/invalidation/eviction, fresh inputs, single argument
evaluation, custom dispatch/methods, effects rejected before body execution,
trace/budget/prototype guards and numeric/loop/work limits. The existing Fold
suite also passes 115 checks in each runtime. Existing copied-source tests pass:
213 related RiX tests and all 559 core tests, zero failures. These are focused
checks for an isolated experiment, not a repeat of the full production suite.

From the repository root:

```sh
node compiler-experiments/metadata-cache/build.js
bun compiler-experiments/marked-exact/run.js
node compiler-experiments/marked-exact/run.js path/to/script.rix
bun compiler-experiments/marked-exact/verify.js
node compiler-experiments/marked-exact/verify.js
node compiler-experiments/marked-exact/tests.js
bun compiler-experiments/marked-exact/bench.js
node compiler-experiments/marked-exact/bench.js
bun compiler-experiments/marked-exact/dispatch-probe.js
node compiler-experiments/marked-exact/dispatch-probe.js
```

Benchmarks should run sequentially without other benchmark/test jobs. The shared
builder reconstructs the metadata-cache experiment in ignored private copies;
it never edits production. `results/provenance.json` identifies the working-tree
source snapshot, including local edits. Rebuilding after source changes creates
a new experiment input; historical timing ratios need not remain identical.
