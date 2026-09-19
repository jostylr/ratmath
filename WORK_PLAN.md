# RatMath / RiX consolidated execution plan

Reconciled against the checkout on **2026-09-19**.

This is the authoritative cross-repository work queue. Detailed source designs
remain useful, but their historical ordering, unchecked boxes, and “decision”
labels do not override this plan. A future instruction to **“go for it”** means
execute the active queue below, in dependency order, through its completion
checks. It does not include the later/user-decision register. This planning
commit does not itself implement the queue.

RiX-Ed and multivariate polynomial/Groebner/elimination work are explicitly
excluded, including their dependent algebraic-extension projects. No files in
`rix-ed/` are part of this planning change.

## Execution handoff — resumed after quota reset

**Resumed 2026-09-19** by explicit user instruction after the quota reset.
The three saved WIP tasks (O3, H1, M1) are now complete and verified.
Completed: **A1, A2, O1, O2, O3, O4, O5, O6, H1, M1**.
O7 publication and M2 consumers are active; M8 is the next independent slice. Continue unchecked tasks in
 dependency order. Keep the later register excluded. Local evidence is under
`tmp/`; `rix-ed/` remains unrelated and untouched.

## Execution rules and settled defaults

- Work in RiX for language/runtime/math changes, Web and Notebook for host
  behavior, and Core only for shared mathematical types/serialization.
- Preserve current syntax, exact values, interval orientation, semantic IDs,
  sandbox groups, and retained-output contracts. New syntax and changed public
  mathematical semantics require a listed decision; ordinary implementation
  choices do not.
- Extend existing schemas where compatible; version incompatible changes.
  Record technical choices and migration rules beside the implementation.
  Do not ask the user to choose algorithms, private file names, or routine UI
  details when this plan and existing conventions determine a reasonable path.
- Imports are inert. Preserve unknown mathematical evidence as unverified;
  never run recipes, load plugins, or fetch assets merely by opening data.
- Exact, certified, assumed, approximate, excluded, and unresolved results
  remain distinct in APIs, views, captions, exported assets, and fallbacks.
- Every iterative algorithm has finite work/precision/output limits, preserves
  partial results, and reports exhaustion. Resumption must validate that the
  original problem and assumptions have not changed.
- Default publication uses existing plain/compact themes, article reports,
  explicit slides, local assets, and current installed toolchains. Static
  output is always available. Unsupported interactive/media features produce
  diagnostics and a useful textual/static fallback.
- Use existing dependencies first. No paid services, deployment, package
  publication, external-account integration, platform signing, or new native
  backend commitment is implied. Those belong to the later register.
- Keep temporary artifacts under the current repository's `tmp/`. Preserve
  unrelated work. Commit coherent implementation slices in each affected
  repository, then commit the compatible submodule pins in this umbrella.
- At the start of each task, inspect its code/tests and subtract work already
  delivered. Do not rewrite a working subsystem merely to satisfy old prose.
  If a task is already done, record the evidence and run its relevant checks.

## Baseline and evidence

The audit ran 94 tests in `output.test.js`, `renderers.test.js`,
`document-plugin.test.js`, `renderer-export.test.js`, and `png-policy.test.js`:
**93 passed, 1 failed**. Actual local PNG, GIF, Quarto HTML, and PDF generation
ran, not just mock adapters. The SVG failure reproduced alone: a `5:4` input
retains reversed presentation, while the test expects ascending `4:5`.
This is a likely stale assertion; A1 must verify the intended contract before
changing it. The full suite was not run as part of this audit.

Implemented foundations that must not be scheduled as new features:

- Parser/evaluator, custom infix operators, secondary-language parsers,
  CodeMirror/Lezer tooling, language server, and generated runtime reference.
- Structured document records, strict templates and inline semantics, media
  metadata, numbered reports, references/citations, asset manifests, and themes.
- SVG/Canvas/TikZ, PNG, LaTeX/PDF, Markdown/HTML/Quarto, GIF, CSV/JSONL exporters.
- Shared viewport/selection records, interactive Canvas and WebGL, linked ODE
  panels, retained time scrubbing, and independent panel zoom.
- Pure-RiX Scene3D/ND realization, projection, flat-lit snapshots, parametric
  surfaces, and glTF JSON output.
- Shaped/Matrix migration; finite Frame-aware vectors/tensors, pairing, maps,
  dual spaces, tensor products/contraction, bounded polynomial realizations,
  and identity-record writing. Writing is not a complete import contract.
- Mathematical graph JSON/JSONL, exact shared identities, descending interval
  round trips, named pi, and frozen opaque-real snapshots. Full recipe revival
  and general output-document persistence are not delivered by that subset.
- Async scopes/streams, bounded lazy pull, cancellation/cleanup, ordinary-value
  snapshots, and host execution workers. A scheduler-owned CPU task pool is a
  different, outstanding capability.
- Structural-arithmetic and control-panel checklists are completed records.

## Order and task format

Each unchecked task is an implementation commitment with a bounded first
release, dependencies, locations, and observable completion criteria. The order
below is the default; independent tasks may be interleaved without changing
scope. No task requires multivariate elimination or RiX-Ed.

1. A1–A2: restore and document the baseline.
2. O1–O7: finish the portable output/publication path.
3. H1–H3: finish host-facing diagnostics, exploration, and authoring.
4. M1–M8: complete the bounded numerical/geometry/ODE pipeline.
5. T1–T3 and N1–N2: finish independent finite algebra and exact-number tools.
6. R1–R4: runtime concurrency, worker integration, and diagnostics.
7. C1–C4: RiXCel editing, modules, and interchange.
8. Q1: cross-host/repository release verification and final backlog reconciliation.

Dependencies named in a task take precedence over this display order. For
example, an O1 identity import may share T2 code, and M4 may implement the
ODE adapters used by O6; there is no requirement to duplicate them or wait for
an unrelated wave. O1 only requires T2 for optional Frame/tensor payloads,
not for the initial document schema.

## A — Baseline and documentation

### A1 — Restore the known output test baseline

- [x] Inspect interval orientation guarantees in Core, SVG metadata, and
  presentation tests. Fix the stale SVG assertion if those contracts agree;
  otherwise fix the smallest actual regression. Cover both interval orders.
- [x] Run the focused five-file output suite; require zero failures. Record
  which external compilation/rasterization checks actually ran.
- [x] Run existing non-education test profiles and classify pre-existing
  failures before broad changes. Fix deterministic in-scope regressions in
  separate commits; do not hide failures with skips or weaker assertions.

**Where:** `rix/tests/eval/renderers.test.js`, SVG lowering, Core interval tests.
**Done:** orientation is preserved end to end and the baseline report is current.

**Completed 2026-09-19:** RiX commit `1eb0c40`. Focused output suite: 94 passed;
legacy: 1,568 passed / 1 existing skip / 134 existing TODOs; RiX short: 1,669
passed; Web short: 52 passed; Notebook short: 18 passed. Actual pdfTeX, Poppler,
librsvg, ImageMagick and Quarto export checks ran successfully. No production
regression: corrected a stale test and covered both interval orientations.

### A2 — Finish source-of-truth and migration cleanup

- [x] Reconcile residual Shaped/Matrix naming in parser ASTs, methods,
  diagnostics, examples, formatters, editor completions, and host consumers.
  Keep mathematical Tensor names where they are actually mathematical tensors.
- [x] Verify constructor/header/source-span coverage, explicit Matrix conversion
  diagnostics, and existing Generate/Map/Reshape/Permute APIs. Implement only
  missing specified behavior; optional new repetition syntax goes to D2.
- [x] Update async, shaped, plugin, host, and output trackers as each slice lands;
  generate reference/catalog pages using existing scripts. Do not hand-edit
  generated HTML or catalogs as substitute implementations.

**Where:** RiX documentation/tooling, Web tutorials, Notebook guides.
**Done:** current guides and generated reference agree; old plans are clearly
historical or link to a live task; cross-host migration tests pass.

**Completed 2026-09-19:** RiX source `a632dc7`, Web source `6d5853f`, Notebook
source `c1ebf3a`, followed by regenerated reference/catalog/tutorial pages. Matrix
formatting and rank validation, Shaped diagnostics/permutation, complete source
spans, compact editor headers and permission-aware completions are aligned.
Expanded migration suite: 738 passed; final focused suite: 143 passed; Notebook:
16 passed. Final docs build: 148 executable blocks passed, 71 HTML pages and
2,364 local references validated. Notebook help synchronization succeeded.

## O — Documents, images, SVG, LaTeX, PDF, and publication

### O1 — Complete inert document persistence

**Depends:** A1; reuse existing mathematical JSON and control-panel snapshots.

- [x] Define versioned encodings for every public block, inline, media, Table,
  Grid, Sheet snapshot, Graphic, Figure, Slide/Slides, and control snapshot.
  Preserve exact values, interval orientation, formal fractions, references,
  labels, evidence, and asset metadata; reject live handles/callables.
- [x] Use bounded document-local identity tables. Implement document-import
  modes `warn-and-skip`, `strict-error`, and `preserve-opaque`; skipped content
  leaves a visible diagnostic/placeholder. Do not weaken the strict Core
  mathematical graph decoder or treat a missing required value as valid.
- [x] Add migrations, malformed/cyclic/dangling reference tests, size/depth
  limits, and byte-deterministic writes. Include optional T2 identity adapters
  only after their round-trip contract exists.

**Where:** RiX output/runtime, schemas, document plugin, Core adapters as needed.
**Done:** a mixed report round-trips without losing exactness or executing code;
unknown records obey the selected mode in CLI, Web, and Notebook.

**Completed 2026-09-19:** RiX `189b583`, Web `213a68e`, Notebook `b919844`.
Versioned inert output graphs, exact values and identity sharing, explicit snapshots,
legacy panel migration, bounded validation and all three unknown-tag modes ship.
Runtime/plugin checks: 19 passed; full document plugin profile: 65 passed; Web/Notebook
imports: 2 passed. Both documentation examples and the browser-target build pass.
Optional Frame/tensor identity adapters remain T2.

### O2 — One numeric presentation policy

**Depends:** O1 schema, existing formatter behavior.

- [x] Separate exact source values from display policy for mixed/improper
  fractions, oriented intervals, scientific notation, significant digits,
  approximation marks, and locale formatting. Use existing source syntax.
- [x] Apply the policy to HTML, Markdown, Quarto, LaTeX, tables/grids, captions,
  controls, and text fallback; persist source and policy separately.
- [x] Add cross-renderer fixtures including huge rationals, reversed/narrow
  intervals, unreduced fractions, and exact values whose displays coincide.

**Done:** changing presentation never changes the source value or its evidence;
exports disclose rounding and remain reparsable through the source record.

**Completed 2026-09-19:** RiX `9cb05e0`. Versioned numeric policy preserves
exact/formal sources, uses integer-only rounding, retains interval order and
outward bounds, and scopes display across document/graphic renderers. Focused
numeric/persistence suite: 22 passed; final numeric evaluator checks: 3 passed;
actual CLI PDF/TeX/HTML/Markdown/QMD export and exact sidecar test passed.
Editable control inputs keep exact source while labels follow the policy. Two
executable documentation examples pass. Generated reference refresh remains Q1.

### O3 — Host asset resolution and portable bundles

**Depends:** O1. **Where:** RiX host adapters, Web, Notebook, RiXCel.

- [x] Implement a shared manifest resolver for package-relative and local
  content-addressed assets, with MIME/dimension/size checks and deterministic
  names. Hash asset bytes for deduplication; this does not define canonical
  mathematical-document signing.
- [x] Resolve only within existing host grants. External URLs remain inert
  links until a host explicitly authorizes fetching. Reject traversal and
  missing/unsupported assets with source-linked diagnostics.
- [x] Complete image dimensions, lazy loading, captions, audio/video controls,
  transcript/reference fallback, and keyboard-accessible media names.
- [x] Package assets with exports and round-trip a generated raster, external
  local image, audio transcript, and video reference across hosts.

**Done:** a moved/offline export has no accidental absolute paths or hidden
network dependencies; every unsupported medium has a readable fallback.

**Completed 2026-09-19:** RiX `b9e1b2a`, Web `03a2cfa`, Notebook `445c9f5`,
Cel `0a07d97` complete the saved bundle implementation. Bounded content-addressed
assets, explicit grants, inert external links and accessible media fallback ship.
Focused checks: 21 passed / 208 assertions; six moved-offline host fixtures
include actual PNG rasterization. Output regression: 73 passed; host regression:
25 passed. All four affected browser/native builds passed. Notebook packages
assets in exports; Web/Cel expose programmatic bundle boundaries. Generated schema
copies remain the integration refresh.

### O4 — Shared graphic diagnostics and accessibility

**Depends:** A1; O2 for formatted labels. **Where:** RiX output tools, Web, Notebook.

- [x] Consume existing SVG coordinate-lowering metadata to expose rounding,
  clipping/collisions, exact originals, precision, and outward-enclosure policy.
  Carry the same disclosures into Canvas and exported snapshots.
- [x] Generalize the interval explorer's text/table alternative, stable labels,
  focus and selection restoration, and restrained live announcements.
- [x] Add deterministic transform property tests and representative visual
  fixtures for huge/narrow/reversed values, dense labels and rounding collisions.
- [x] Exercise keyboard-only operation, reduced motion, high zoom, responsive
  layout, and reactive rerender selection in Web and Notebook.

**Done:** each supported interactive graphic has an equivalent inspectable
static/text result; approximation and uncertainty are not hidden in pixels.

**Completed 2026-09-19:** shared metadata-derived coordinate tables and SVG
descriptions, Canvas interval snapshots, stable focus/disclosure/selection and
letterbox-correct pointer transforms. Affected output suite: 131 passed; final
interaction properties: 44 passed / 1,700 assertions; Web: 3 passed; Notebook: 5
passed. Actual Chromium keyboard, 64× zoom, reduced-motion and 360px/200% layout
checks passed. Manual screen-reader user studies are not claimed. O2 supplies
optional formatted labels while exact originals remain inspectable.

### O5 — Portable publication plan and richer layout

**Depends:** O1–O3. **Where:** document plugin and all document renderers.

- [x] Define a versioned publication plan over the existing output tree:
  page/slide size, theme, bounded columns, float hints, long tables, indexes,
  headers/footers, bibliography and required asset capabilities.
- [x] Adopt existing plain/compact themes and deterministic target fallbacks.
  Treat layout as presentation; do not duplicate mathematical content trees.
- [x] Add LaTeX article/Beamer lowering, repeated long-table headers, indexes
  and multicolumn layout; negotiate packages and SVG/TikZ/PNG assets explicitly.
- [x] Add Quarto RevealJS/book/site source generation, cross-document labels,
  and stable assets by reusing Notebook's existing deck/project work.
- [x] Feed PDF profiles from the same plan. Report unsupported accessibility,
  fonts/color policies, and layout losses; do not claim PDF/A or tagged-PDF
  conformance without a selected toolchain and verifier (D7).

**Done:** one report and one deck export through HTML, QMD, TeX, and PDF with
consistent references, captions, evidence and documented layout fallbacks.

**Completed 2026-09-19:** versioned presentation plans, article/Beamer layouts,
long tables, bounded columns, running regions, indexes and Quarto books/sites/decks.
One report/deck retains exact content across HTML/QMD/TeX/PDF and source sidecars.
Combined output regression: 45 passed / 336 assertions; final native regression:
12 passed / 92 assertions, followed by 5 final checks / 57 assertions. Actual
pdfTeX compiled a 150-row table with repeated headers on every page; Quarto built
a linked book and RevealJS deck. Article/deck PDF previews were visually inspected.
Fixed first-page running regions and bounded compiler reruns for resolved page
references. Both executable guide cells pass. PDF conformance remains explicitly
unverified. Notebook shares the validated project builder (`0364861`).

### O6 — Finish static scene and animation export

**Depends:** O3; existing Scene3D snapshot/timeline schemas.

- [x] Accept versioned Scene3D snapshots in TikZ and normalize animation frames
  through the existing Graphics path. Preserve projection/evidence metadata.
- [x] Simplify exact coordinate source without changing values; add deterministic
  SVG definition/path optimization that preserves IDs, styles and diagnostics.
- [x] Preserve GIF captions, frame descriptions, timing, and source/evidence as
  deterministic JSON/text sidecars, including a static frame/contact-sheet path.
- [x] Add export fixtures for lit 3D scenes, retained trajectory frames and a
  mathematical derivation; exercise available TeX/raster/GIF tools.

**Done:** static formats and animation fallback share the same retained source,
with useful metadata even when an encoder is unavailable.

**Completed 2026-09-19:** bounded Scene3D/TikZ and animation normalization,
exact coordinate simplification, conservative SVG optimization, GIF evidence/caption
sidecars and encoder-independent contact sheets. Final export fixtures: 10 passed,
including actual installed TeX/raster/GIF tools and optimized-raster equivalence.
Host asset packaging remains the shared O3 integration.

### O7 — Publication workflows across CLI and Notebook

**Depends:** O3–O6. **Where:** CLI host, Notebook project/export services.

- [ ] Add named export profiles to project/notebook manifests and a bounded
  batch build over documents, inputs and target matrices. Stable filenames,
  deterministic manifests and per-document diagnostics are required.
- [ ] Add watch/rebuild with dependency invalidation, debouncing, cancellation
  of superseded builds, atomic output replacement and recoverable failures.
- [ ] Extend existing live HTML publication through retained interaction
  descriptors, bounded animation lowering and incremental SVG updates; preserve
  stable IDs, selection and the same no-JavaScript result. Reuse current controls,
  selection, viewport and linked-panel protocols.
- [ ] Provide an end-to-end publication showcase and host capability table:
  source generation versus binary compilation, native versus browser, installed
  versus unavailable tools. Add offline/CSP-safe packaging using current assets;
  do not introduce remote CDNs or claim integrity for unverified dependencies.

**Done:** a reproducible local report/deck build and rebuild works from CLI and
Notebook, including missing-tool diagnostics and portable bundled assets.

## H — Web and Notebook experience

### H1 — Exact exploration and reactive workspace

**Depends:** O4; reuse existing mathematics.

- [x] Add dashboard pinning/grouping and bounded history charts as presentation
  state; preserve exact graph values and enforce history limits.
- [x] Generalize rational/interval number-line Graphics and arithmetic
  provenance beyond the top-level expression, recording widening, undefined
  regions, and evidence without capturing unlimited evaluation histories.
- [x] Link mediants, Farey neighbors, Stern–Brocot paths, continued-fraction
  convergents and exact errors through public RiX services. Reuse existing
  Stern–Brocot pages rather than replacing them.

**Where:** Web, reusable RiX Graphic/provenance helpers.
**Done:** all views support exact inspection, reinsertion, static SVG/text,
and keyboard navigation with bounded history/work.

**Completed 2026-09-19:** bounded exact number-line/provenance and fraction
bridges, dashboard pin/group persistence and 64-observation history. RiX checks:
7 passed / 240 assertions; Web short: 60 passed / 3,498 assertions; final host
checks: 8 passed. Actual Chromium covered save/reload, SVG/HTML/text exports,
keyboard reinsertion/focus, undefined gating, reversed 10^-400 intervals,
200% narrow layout and the 16,384-bit fallback. Inspection never executes calls
or assignments. Source commits are recorded in repository history.

### H2 — Notebook authoring and host parity

**Depends:** O3/O7 where applicable; R2 for async behavior.

- [ ] Finish common completion/diagnostic/source-location integration in both
  workbenches using the existing language service and CodeMirror support.
- [ ] Preserve cross-note references/figure IDs and expose export capabilities
  accurately. Keep native filesystem/plugin grants and browser ZIP storage
  behind the existing DocShell adapters.
- [ ] Verify open/edit/save/reopen and static/live exports, widget disposal,
  plugin failures, and missing-asset/tool diagnostics on both host paths.

**Done:** authoring and supported exports have automated host integration tests;
unsupported native capabilities are not simulated by the browser.

### H3 — Runnable tutorial and capstone coverage

**Depends:** completed features in the relevant task, not all tasks at once.

- [ ] Compare the tutorial curriculum outline to actual pages/tests and fill
  real gaps only. Keep method reference chips/catalogs generated.
- [ ] Add one end-to-end capstone per delivered pipeline: publication,
  certified nonlinear/ODE exploration, exact-number views, tensor coordinates,
  async cancellation, and RiXCel interchange.
- [ ] Include bounded-failure and unavailable-host examples, prerequisites,
  exact-versus-approximate explanations, and static output alternatives.

**Done:** examples execute in supported hosts and proposed/unsupported examples
cannot misleadingly run. This excludes curriculum production in RiX-Ed.

## M — Bounded numerical, symbolic, and visualization work

### M1 — Validated linear solves and box subdivision

**Depends:** A1. **Where:** Numerics, Linalg/Ball adapters, result schemas.

- [x] Add interval-linear solves and multidimensional interval-Newton contraction
  beside existing Krawczyk. Retain preconditioners, singular/ill-conditioned
  diagnostics and replayable containment evidence.
- [x] Implement deterministic bounded subdivision with exact variable ordering,
  excluded/unique/unresolved boxes, work accounting and resumable records.
- [x] Add Ball polynomial/derivative-bound and validated-linear adapters over
  the same service; never promote heuristic midpoint solves to certification.

**Done:** known-root, no-root, singular, boundary-root and budget-exhaustion
fixtures retain all unprocessed regions; independent checks replay claims.

**Completed 2026-09-19:** RiX `97c2217` completes validated interval-linear
and Newton-box solves, deterministic subdivision/resumption and Ball adapters.
Regression: 42 passed / 556 assertions, both plugin tutorials and all five new
executable cells passed. Independent arithmetic replay, coverage, tampering,
singular/boundary roots and exhaustion checks pass. Budgets cap dimensions,
iterations, boxes, depth, rational-component digits and aggregate evidence text;
arithmetic exhaustion retains unresolved regions. Unique boxes are not a
claim of distinct root count; no midpoint heuristic is called certified.

### M2 — Solve and implicit geometry consumers

**Depends:** M1. **Where:** Solve, Geometry, Plot.

- [ ] Consume numerical boxes without requiring multivariate Polynomial objects.
  Keep root finding, feasibility and optimization distinct.
- [ ] Trace bounded implicit curves/intersections using certified boxes and
  refinement callbacks; report singular/tangent/unknown topology explicitly.
- [ ] Render excluded/unique/unresolved regions with exact metadata; add local
  implicit-function refinement only where its hypotheses are checked.
- [ ] Add draggable parameterized constructions using retained events; failed
  constraints preserve the last certified result with repair diagnostics.

**Done:** scalar and multidimensional examples, including a singular system,
produce honest partial graphics and tutorials without an algebraic eliminator.

### M3 — ODE construction performance and solver increments

**Depends:** A1; M1 for boundary shooting.

- [ ] Profile the documented slow async higher-order vector construction against
  its synchronous equivalent; eliminate redundant evaluator/derivative work
  without changing scheduling/evidence. Record timings and work counts; use
  deterministic work-count regressions rather than brittle timing thresholds.
- [ ] Add explicit higher-order-to-first-order reduction and recognized exact
  scalar solutions for constant and affine linear equations, with verification.
- [ ] Add one embedded RK provider (Dormand–Prince 5(4)) with bounded rejection
  and disclosed local-error estimates; keep it distinct from validated flow.
- [ ] Extend interval Taylor dependency control to bounded polynomial/affine
  remainder models, comparing containment and exhaustion to current methods.
- [ ] Add boundary-value records and bounded shooting using vector IVPs and M1;
  collocation is not required for this release. Preserve unresolved branches.

**Done:** forward/backward, event, stiff-looking failure, interval initial-state,
partial trajectory and async/sync parity fixtures pass; no false global bounds.

### M4 — Trajectory and certified Scene3D adapters

**Depends:** M1–M3 as used. **Where:** Geometry, Plot, Scene3D, ND, complexViz.

- [ ] Add Scene3D trajectory/tube/event adapters and general linked selection
  over existing panels, snapshots and stable semantic IDs.
- [ ] Add bounded implicit-surface subdivision and uncertainty masks, explicit
  volume/slice records and budgeted mesh detail; unresolved cells remain visible.
- [ ] Extend ND implicit regions and linked affine projections/slices, then
  complexViz `(Re z, Im z, Re f, Im f)` slices and linked input/output views.
- [ ] Add certified unit-quaternion transform/interpolation adapters over the
  existing transform schema; reject arbitrary nonunit rotations explicitly.

**Done:** exact/certified/approximate provenance survives projection, interaction,
SVG/Canvas/WebGL snapshots and O6 export; all sampling has finite budgets.

### M5 — Integer and bounded nonlinear optimization

**Depends:** M1/M2; existing exact LP and symbolic constraint normalization.

- [ ] Implement exact branch-and-bound integer/mixed-integer LP, deterministic
  branching, incumbent/lower-bound/gap records, unprocessed nodes and resumption.
- [ ] Add exact convex quadratic cases with checked convexity/KKT conditions;
  constrained nonlinear requests use bounded Numerics box services with explicit
  derivative assumptions and honest local/global/unknown distinctions.
- [ ] Extend existing Solve constraint/objective dispatch, preserving strict
  inequalities and exact domains; do not rebuild implemented affine dispatch.

**Done:** optimal, infeasible, unbounded and exhausted examples have independently
checked evidence and preserve partial results. External solvers remain D8.

### M6 — Finish the bounded course CAS/calculus ladder

**Depends:** existing public expression/rule contracts; no new global assumption
semantics from D3 are required.

- [ ] Complete mixed trig powers, a small explicit set of radical substitutions
  (quadratic square-root forms), and parity/interval-symmetry definite integrals.
- [ ] Add bounded replayable sign/power/root/trig simplification, absolute-value
  domain graphs, and hole-preserving rational cancellation only under explicit
  existing premises. Represent piecewise domains without new global assumptions.
- [ ] Connect exact integration to certified quadrature and explicitly
  approximate fallback, preserving domain checks and work/evidence.
- [ ] Add inert differential/boundary/integral-equation specifications and
  declared derivative providers/bounds for opaque functions; solver execution
  remains in Numerics/Solve/ODE. Do not imply a general integral-equation solver.

**Done:** standard secondary/undergraduate examples plus invalid-domain and
unsupported-rule cases have replayable transformations and no hidden assumptions.

### M7 — Tagged relations and safe real interchange

**Depends:** existing mathematical JSON, O1 for document integration.

- [ ] Implement single-document tagged JSON relations and CSV/JSONL round trips
  through the current exact scalar envelope, preserving schema and missing cells.
- [ ] Complete standalone frozen-real snapshot import/export with strict bounds,
  opaque-subject identity and unverified-evidence handling. Adopt deterministic
  writer ordering, embedded evidence and exact checker/provider-version matching.
- [ ] Define an explicit recipe registry over existing stable semantic IDs;
  imports remain inert and unavailable recipes remain useful snapshots. Only
  explicit refine requests may use already-installed permitted providers.
- [ ] Begin with existing named constants and arithmetic/root/exp/log/trig
  expressions with explicit branches. Unsupported recipes remain opaque; use
  the existing general graph container rather than add mandatory file syntax.

**Done:** unavailable/version-mismatched providers never erase the enclosure,
run code on load, or invent checked identity. Malformed and oversized inputs fail.
These are implementation defaults for the technical choices in the refinable-real
spec; cryptographic canonicalization and external evidence stores remain D7/D8.

### M8 — Bounded propositional sequent presentation

**Depends:** existing propositional logic and evidence checker.

- [ ] Implement a separate classical propositional sequent rule set and bounded
  replayable tree renderer, with an explicit rule ID per step and work limits.
- [ ] Compare examples to existing natural deduction/tableaux without relabeling
  those proof records. Add explicit adapters for existing algebra/interval
  propositions only where a checker can establish the exact claim.

**Done:** invalid rules are rejected, exhaustion is distinct from invalidity,
and proof trees export through ordinary document/graphic renderers.
Finite first-order language design remains D4.

## T — Finite linear and tensor algebra

### T1 — Finish finite tensor semantics

**Depends:** existing Frame/slot model. **Where:** Linalg, runtime methods.

- [ ] Complete slot permutation, canonical/noncanonical dual Frames, view versus
  component-slice rules, equality across representations, and bounded bang
  transformation provenance. Preserve existing pairing/products/contractions.
- [ ] Add explicit Rational metrics, raising/lowering, symmetry/antisymmetry,
  traces and tensor powers through methods (no new header syntax).
- [ ] Verify coordinate invariance, incompatible-slot diagnostics and exact
  metric/domain checks; Euclidean identification is never implicit.

**Done:** transformations, duality and contractions commute where specified;
operations needing an absent metric diagnose it explicitly.

### T2 — Linear identity imports and domain realizations

**Depends:** T1 where relevant; O1 integration is optional.

- [ ] Add validated round-trip graph import for existing identity-record writers,
  preserving within-document sharing but assigning fresh runtime identities.
- [ ] Reject dangling Frames, conflicting space dimensions/domains and invalid
  lineage. Complete source-linked realization views and reconstruction tests.
- [ ] Keep PolynomialSpace in Linalg with its existing public spelling;
  specify the Rational scalar-field/finite coordinate-storage protocol.

**Done:** serialized spaces, Frames, tensors, maps and bounded polynomial views
round-trip without closures, forged identity or source-domain loss.

### T3 — Rational spectral and finite-support extensions

**Depends:** T1/T2; existing univariate Polynomial services.

- [ ] Implement characteristic/minimal polynomials and Rational eigenspaces,
  verifying annihilation and eigenvector residuals exactly. Rational canonical
  forms may use univariate Q[x]; unsupported extension-field Jordan forms must
  remain explicit diagnostics and later work.
- [ ] Add finite-support sparse coordinates, countable monomial Frames for finite
  polynomials, bounded-degree inclusion/projection, support-growth limits, and
  sparse tensor products using the coordinate-storage protocol.
- [ ] Add replayable finite decomposition/coordinate evidence over existing
  checkers. Infinite convergent expansions/topology remain D9.

**Done:** finite support stays finite and canonical, dense/sparse results agree,
and no multivariate Polynomial or algebraic extension is introduced.

## N — Exact-number and fraction tools

### N1 — Versioned numeral systems and playground

**Depends:** existing Radix/parser registry; H1 for shared view patterns.

- [ ] Define constructors for ordinary, multi-token, balanced and negative-base
  positional systems. Core owns digit/place arithmetic; RiX owns parser labels.
- [ ] Require unambiguous token alphabets initially; reject collisions rather
  than choosing hidden longest-match behavior. Preserve exact rational parsing,
  normalization, carries, repeating expansions and bounded work diagnostics.
- [ ] Support the existing exact-number grammar where meaningful and reject
  unsupported combinations explicitly. Emit canonical `.Name` labeled backticks;
  locale profiles are reversible adapters, never changes to mathematical values.
- [ ] Build the Web playground showing place weights, digit values, carry steps,
  signed behavior and exact parse/format round trips; reuse portable examples.

**Done:** all four system families have round-trip/property tests, bounded repeat
handling and accessible static snapshots. No new interval/fraction syntax (D1).

### N2 — Fraction-path evidence and continued-fraction adapters

**Depends:** H1; existing Fraction/continuedFraction services.

- [ ] Add portable fraction parentage/path/derivation records for mediants,
  Stern–Brocot/Farey paths and convergents, with exact replay checks.
- [ ] Connect those records to public symbolic values and exact convergent-error
  bounds, without a general correlation-proof or theorem-prover claim.

**Done:** educational views and static documents reuse the same verified records
rather than reimplementing arithmetic in the browser.

## R — Runtime, workers, and performance

### R1 — Complete concurrency bookkeeping and safety

**Depends:** A1. **Where:** async runtime/evaluator, capability registry.

- [ ] Carry complete structural task paths through admission, output, cleanup,
  errors and traces; add host maximums and detached task/queue limits.
- [ ] Classify capability effects, cancellation and concurrency safety; default
  unknown/effectful capabilities to the owner serial lane. Propagate abort to
  capable adapters without claiming rollback of completed effects.
- [ ] Add async recurrence callbacks without promises in synchronous caches,
  and deterministic stress tests for suspension, simultaneous breaks, low
  limits, cancellation storms, hot queues and shutdown.

**Done:** async/sync parity where defined, bounded queues, exact-once cleanup,
and source/task-linked diagnostics across CLI/Web/Notebook entry points.

### R2 — Notebook async and scheduler worker execution

**Depends:** R1; existing host execution workers.

- [ ] Make the shared Notebook engine await async evaluation and dispose/drain
  owned scopes on reset/close/rerun; keep cell ordering and reactive observation.
- [ ] Define a versioned task-worker protocol for supported IR, captured inert
  values, random state, diagnostics, cancellation and results. Reject or retain
  unsupported/nonserializable capabilities on the owner executor.
- [ ] Add a bounded pure-task worker pool, message-boundary checkpoints,
  termination grace periods and owner-routed reactive literal/batch commits.

**Done:** worker/event-loop semantic equivalence tests pass; cancellation does
not publish stale cell results or leak workers/streams; this is not a rewrite
of the existing editor worker protocol.

### R3 — Streams and observability

**Depends:** R1/R2 as applicable.

- [ ] Segment stateful stream barriers so later safe elementwise regions regain
  bounded concurrency. Add ChunkBy/Merge/Timeout/Debounce/Throttle/Latest with
  explicit ordering, clock, close and overflow behavior in a design record.
- [ ] Add timer/reactive/UI adapters and permission-aware HTTP/file/WebSocket
  adapters over existing host contracts; test against local fixtures only.
  Database connectors remain D8.
- [ ] Expose queue/running counts, executor, task paths, cancellation reasons and
  ordered output in trace tooling; add reproducible I/O/pipeline/CPU benchmarks.

**Done:** bounded deterministic fake-clock/fixture tests, no ambient network
access or new permissions on existing scripts, and cleanup on every terminal.

### R4 — Bounded performance and robustness pass

**Depends:** profiling baseline from R1/M3/O4; current public contracts.

- [ ] Add parser/tokenizer fuzz/property tests, malformed-number/Unicode/source
  span regression fixtures, large-input limits and editor recovery diagnostics.
- [ ] Add Float typed-array tensor adapters and sparse finite linear methods
  where supported; preserve evidence and exact/approximate boundaries.
- [ ] Add Canvas path caches, OffscreenCanvas/worker plans where supported, dirty
  repaint and bounded heatmap/downsampled/streaming plot inputs. Keep main-thread
  and static fallbacks, and validate semantic IDs/accessibility companions.
- [ ] Profile memory/allocation and numeric/rendering hot paths; optimize measured
  bottlenecks with deterministic output checks. Report limits that cannot be
  enforced in-process rather than claiming hard memory isolation.

**Done:** representative benchmarks record before/after costs, caches invalidate
correctly, and exact/evidence semantics are unchanged. New GPU/Wasm/native
providers, huge raster pipelines and distributed execution remain D10.

## C — RiXCel

### C1 — Structural editing and reliable history

**Depends:** existing tokenizer-aware reference rewriting.

- [ ] Add row/column insertion as atomic shape-changing history events with
  reference updates, dynamic-reference diagnostics, stable IDs and undo/redo.
- [ ] Add real browser editing/persistence tests for formula entry, copy/fill,
  insertion, sparse navigation, errors, restart, open/save and undo/redo.

**Where:** `apps/cel/`, RiX FormulaSheet/runtime.
**Done:** save/reopen and undo/redo reproduce exact shape/formulas/values without
corrupting references or materializing the entire logical grid.

### C2 — Workbook namespaces and cross-graph dependencies

**Depends:** R1 where background updates are used.

- [ ] Implement explicit `book`, `names`, and `imports` namespaces and document-
  owned exports; coordinate tracked cross-graph dependencies with atomic epochs,
  cycle diagnostics and disposal.
- [ ] Adopt explicit refresh for external/volatile sources by default. Scheduled
  refresh is opt-in host policy; preserve source/version metadata and bound work.

**Done:** cross-sheet edits recompute once per epoch, import/reactive cycles show
complete paths, and failed updates do not publish mixed old/new states.

### C3 — Notebook embedding and XLSX value interchange

**Depends:** C2, O3, H2.

- [ ] Embed a RiXCel document as a notebook widget with explicit named exports,
  isolated execution, lifecycle disposal and script/document import-cycle checks.
- [ ] Add XLSX values and sheet-structure import/export through a host adapter,
  preserving source metadata, dimensions and exact values where the format can.
  Disclose numeric precision loss; retain unsupported formulas as inert text.
- [ ] Use an existing compatible library if available; otherwise isolate the
  adapter and select a maintained permissively licensed dependency through an
  implementation record. No Excel automation or account integration is needed.

**Done:** round-trip value fixtures, sparse/large-sheet limits and notebook
reactivity work; formulas are never executed under another language by accident.
Executable Excel-formula translation remains D6.

### C4 — Explicit tensor materialization and sheet formatting

**Depends:** T1/T2, C1/C2.

- [ ] Add explicit snapshot materialization of a selected finite tensor plane
  into formula slots and linked read-only tensor views. Collisions diagnose
  and leave the destination unchanged; automatic spill semantics remain D6.
- [ ] Add block formatting and named rank-N regions without changing canonical
  numeric addresses or exact values.

**Done:** plane changes, shape mismatches, readonly updates and collisions have
atomic, tested behavior in the editor and notebook embedding.

## Q — Completion gate

### Q1 — Verify the delivered queue and close the plan

- [ ] For each task: update public reference, tutorial/example, schemas and
  capability group; run meaningful positive, invalid-input and bounded-failure
  tests. Record actual external tools exercised and explicit unavailable cases.
- [ ] Run RiX focused/plugin tests during development and the complete RiX suite
  for completed plugin milestones. Run relevant Web, Notebook, Cel and Core
  tests after shared-contract changes; use existing documentation/editor checks.
- [ ] At final integration run the complete non-education repository checks:
  `bun test --dots apps packages` from the umbrella, and `bun run test:suite`
  separately in `rix`, `rix-web`, and `rix-nb`. Existing umbrella named profiles
  include RiX-Ed, so do not use them to silently expand this scope.
- [ ] Run RiX native tests, docs verification, editor-policy and package dry-run/
  isolated-consumer checks when their contracts changed. No publish is implied.
- [ ] Inspect representative exported report, deck, SVG/PNG and PDF pages;
  compile with available tools. Byte/header assertions alone are not visual QA.
- [ ] Mark tasks complete only with evidence. Commit changed repositories and
  compatible umbrella pins; leave the later register intact and report remaining
  environmental limitations instead of claiming unrun checks passed.

**Done:** every active task is complete, tests are green, exports are inspectable,
and the remaining backlog consists only of explicitly deferred decisions/scope.

## Later tasks and user decisions

These are **not** included by “go for it” on the active queue. Recommendations
are proposals, not approvals. When a decision is made, add a finite task with
its own acceptance criteria rather than activating an entire research heading.

| ID | Later work / decision needed | Recommendation |
|---|---|---|
| D0 | **RiX-Ed**, curriculum readiness, learner/educator review, and its repository tracking | Keep a separate education plan and leave its files untouched here. |
| D1 | New interval `.:` / `:.` and unreduced-fraction surface syntax | Keep current oriented `a:b` and registered parser forms; decide new spelling only with ambiguity/formatting examples. O1/O2 must not depend on it. |
| D2 | New language syntax: prefix/postfix custom operators, macros, tensor powers/contraction notation, convenience `FramedSpace`/`AsVector` sugar, optional Tile/Repeat/Expand/Pad semantics | Prefer current methods and explicit shape generation. Bring a small syntax proposal only when a real example cannot be expressed clearly. |
| D3 | Shared global assumptions/restricted-domain wrappers, named complex branches, continuation paths and monodromy | Preserve existing explicit per-result premises. Adopt a versioned branch/obligation value before generalizing; never make principal-branch assumptions silently. |
| D4 | Finite first-order logic language and model-search scope | Start with explicit nonempty finite domains, equality, relation tables and quantifiers; exclude function symbols and distinguish bounded countermodels from validity. |
| D5 | **Multivariate Polynomial/Groebner/elimination**, extension fields, multivariate FractionFunction, exact conic/algebraic isolation, extension-field eigenspaces/Jordan forms, Oracle multivariate sign/root exchange | Later separate program; start over Q with explicit monomial orders and replayable reductions. None is required by M1–M5 or T3's rational subset. |
| D6 | Excel formula compatibility and tensor spill behavior | First ship C3 values/structure and C4 explicit materialization. Later choose a supported formula subset and explicit spill ownership/collision/resize rules; do not promise general Excel compatibility. |
| D7 | Production publishing targets: tagged PDF/PDF-A, print color profiles, journal templates/fonts, canonical signed JSON, external evidence stores, native app signing/distribution | Choose one concrete target/toolchain and verifier first. Keep deterministic source/local bundles as baseline. Font licensing and signing identities need explicit selection. |
| D8 | External CAS/SMT/proof assistants, Arb/MPFR/Acb, database/CMS/network services, external solver/provider, decomposition/column-generation or certificate ecosystems | Require a concrete use case, chosen provider, license and trust/permission policy. Keep public portable schemas and native checkers; avoid mandatory external services. |
| D9 | Research programs: abstract metric/Banach/Hilbert/Lp spaces, infinite expansions/topologies, nonlinear coordinate charts/tensor fields, distributions/Sobolev/PDE theory, Cauchy completeness/proof exchange, continued-fraction correlation proofs, Cayley one-generated series/derivatives/zero divisors, quaternion slice/Fueter and octonion/G2/Jordan analysis | Choose one educational/research question with a finite example and explicit evidence contract. Finite-support polynomial coordinates in T3 do not authorize infinite-series/topology semantics. |
| D10 | Scale/acceleration: SIMD/Wasm/native/GPU/WebGPU providers, distributed numerics, Arrow/Parquet/lazy data warehouses, huge tiled/16-bit/linear-color raster output, WebP/AVIF/APNG/WebM/MP4 codecs | Profile R4 first, then pick one bottleneck and supported backend. Do not add optional native dependencies solely because a roadmap mentions them. |
| D11 | Advanced analysis/solvers: stiff/DAE/delay/symplectic/PDE solvers, broad continuation/collocation, generalized/Bayesian statistics, stochastic processes, complex special functions/contour integration/root isolation | Select a narrow problem family and validation standard before implementation. Existing bounded scalar/vector and finite-data services remain the default. |
| D12 | Interactive terminal repaint/input, external symbol libraries/vector-authoring round trips, full 3D ecosystem (GLB/import, textures, animation assets, OBJ/STL/PLY/USD/AR/printing) | Pick a real host/format and round-trip requirement. Continue portable static terminal output, existing glTF JSON and O6 snapshots meanwhile. |
| D13 | Broad automatic proof/locus exploration, unrestricted CAS/Risch-style integration, grammar-of-graphics replacement, general symbolic closure builder and pure-RiX `.fracfun` migration | Keep bounded named rules/public expression contracts. Choose a concrete missing operation before committing to a new general architecture. |
| D14 | Renewed legacy Calc/WebCalc/Forge feature development and old support-package plans | Maintain compatibility; put new parser/evaluator and document features in RiX. Reactivate a legacy plan only after choosing its product role relative to Notebook/Cel. |

The refinable-real specification's filename, writer ordering, opaque snapshot,
provider version, expression allowlist and embedded-evidence questions are
technical choices settled for the bounded M7 implementation above. They are
not new user gates. Similarly, the publication and retained-interaction
contracts are engineering work in O4/O5/O7; no aesthetic choice is required to
use existing themes. More ambitious branch semantics, publication guarantees
or external providers remain explicit decisions here.

## Coverage map for the old plans

Every active source family is assigned below. Checked history stays checked;
unchecked subitems are either in the named active tasks or in the named later
scope. A Phase 4 label alone is not a reason to forget work.

| Source / family | Active tasks | Later scope |
|---|---|---|
| Document blocks/templates/assets and all document exporters | O1–O7, H2, Q1 | D1, D7, D10 |
| SVG/Canvas/PNG/GIF/TikZ/terminal renderers | O4/O6, R4 | D7, D10, D12 |
| Draw/Plot/Geometry/Scene3D/ND/complexViz | O4/O6, H1, M2/M4, R4 | D5, D10, D12/D13 |
| Radix/Fraction/continuedFraction | N1/N2, H1 | D9 |
| Float/Numerics/ODE/Ball | M1/M3, R4 | D8–D11 |
| Oracle/Algebra/algebraicReal/fracfun | M7, existing scalar services reused | D5, D8/D9, D13 |
| Linalg/Shaped/Matrix/Vector/Tensor | A2, M1, T1–T3 | D2, D5, D9/D10 |
| Optimize/Solve | M1/M2/M5 | D5, D8, D11 |
| CAS/Symbolic/Calculus | M6; existing expression services reused | D3, D8, D11/D13 |
| Logic | M8 | D4, D8/D13 |
| Analysis/Cauchy/Complex/Cayley/Quaternion/Octonion | M4's rotation adapters only | D3, D5, D8/D9/D11 |
| Data/CSV/JSONL | M7, O1/O3 | D8/D10 |
| Stats/Probability | Existing results consumed in plots | D11 |
| Async concurrency design | R1–R4, H2 | D8 database/external services; D10 distributed execution |
| RiXCel checklist | C1–C4 | D6 |
| Web TODO/tutorial outline | H1–H3, O4, N1 | D3/D5 only where explicitly needed |
| Notebook README/architecture | H2, O3–O7, R2, C3 | D7 distribution/signing |
| Parser-only historical TODO | A2, R4 | D2 |
| Structural arithmetic/control panels/Scene3D split | Completed records; regression coverage in Q1 | New features only through tasks above |
| Forge and old arithmetic/oracle implementation plans | Compatibility checks in A1/Q1 | D14; async-oracle plan already marked implemented |

Primary source indexes:

- [Plugin roadmap](rix/plugins/TODO.md)
- [Document output](rix/documentation/design/eval/document-output-todo.md)
- [Shaped and mathematical tensors](rix/documentation/design/eval/shaped-array-matrix-tensor-plan.md)
- [Async runtime](rix/documentation/design/eval/async-concurrency.md)
- [RiXCel](rix/documentation/design/eval/rixcel-todo.md)
- [Web](rix-web/TODO.md) and [tutorial curriculum](rix-web/tutorial-plan.md)
- [Notebook](rix-nb/README.md) and [host boundaries](rix-nb/ARCHITECTURE.md)
- [Mathematical serialization](rix/documentation/eval/mathematical-serialization.md)
- [Refinable-real design](rix/plugins/numerics/refinable-real-json.md)
