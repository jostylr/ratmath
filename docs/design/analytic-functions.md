# Analytic functions with certified errors — design

Status: proposal (2026-11-06). Prompted by RatTree's Taylor functions. Goal: a
small JavaScript library of *exact polynomials plus rigorous remainders* that
RatCalc, RatTree, webcalc and a future "Analytic Graphics" app import, so that
composition, differentiation, integration and simple ODEs keep honest error
bounds and domains. Not part of Core (Core stays numbers, intervals, `R`), and
not part of a page.

## 1. What RatTree has today, and its limits

RatTree's Taylor function is "sum `term(x, n)` for `n = 0..N`, then add
`[-E, E]`", where `E` comes from either a user-written error formula or Taylor's
theorem with the Lagrange remainder:

    f(x) = Σ_{j≤p} f^(j)(0)/j! · x^j + R,   R = f^(k)(ξ)/k! · x^k  (ξ between 0 and x)
    |R| ≤ M · |x|^k / k!   where M ≥ max |f^(k)| on [0, x], k = p + 1

RatTree's "Lagrange" mode asks for `M(x, n)` and the order `k` (default `n+1`;
`2n+3` for sin's odd series, `2n+2` for cos, because the skipped even/odd term is
zero). Presets: eˣ (`M = 3^⌈|x|⌉`), sin and cos (`M = 1`).

Limits that motivate a library:

- The user must supply `M`. That is easy for eˣ, sin, cos, and hard for
  anything composed (what bounds the 12th derivative of `exp(sin x)`?).
- Each evaluation re-sums the series at a point. Nothing is reusable: no
  polynomial object, no composition, no derivative or integral.
- "Next term" rules (alternating series; geometric tails) are written by hand
  as error formulas; nothing checks their hypotheses.
- Interval arguments are pushed through the sum term by term, which is valid
  but loose (`SIN(-1:1)` gives ±1.18, not ±0.84).

## 2. Core idea: Taylor models

A **Taylor model** on a domain `D = [a, b]` (with expansion centre `c ∈ D`) is

    T = (P, I)    with   f(x) − P(x − c) ∈ I   for every x ∈ D

where `P` is a polynomial with exact rational coefficients (Core `Rational`)
and `I` is a rational interval (Core `RationalInterval`). This is the standard
object of validated numerics (Berz–Makino Taylor models; Moore's interval
analysis). Everything below is arithmetic on such pairs, with exact
coefficients and outward-rounded remainders, so results are proofs, not
estimates.

Fields: `domain`, `centre`, `coefficients[]` (exact), `remainder` (interval),
`order` (max degree kept), `provenance` (how it was built, for display).

### 2.1 Sources (leaves)

| Source | How the remainder is obtained |
|---|---|
| `x` (identity) | exact, remainder `[0, 0]` |
| constants, rational expressions | exact polynomial, or a model of `1/(…)` (below) |
| elementary functions: exp, sin, cos, atan, log(1+·), (1+·)^a | known coefficients; remainder from a *certified rule* (2.2) on `D` |
| user series `term(x, n)` + rule | the RatTree definitions, promoted to models |
| user polynomial + error formula | the RatTree "explicit" mode; trusted as stated (marked *assumed*) |

### 2.2 Remainder rules, each with checkable hypotheses

| Rule | Bound on the tail after degree p | Hypotheses the library checks |
|---|---|---|
| Lagrange | `M·r^k/k!`, `r = max |x − c|` on D | `M` bounds `|f^(k)|` on D: supplied by the function's spec (exp: `e^max(D)`, enclosed via a certified `e`; sin/cos: 1) |
| Alternating next term | `|t_{p+1}(x)|` | terms alternate in sign and decrease in magnitude on D (checked symbolically for the standard series, or by bounding the ratio ≤ 1 on D) |
| Ratio (geometric) tail | `|t_{p+1}| / (1 − q)` | `|t_{j+1}/t_j| ≤ q < 1` for all `j > p` on D (q from a ratio formula bounded on D) |
| Cauchy estimate | `M_ρ · (r/ρ)^{p+1} / (1 − r/ρ)` | f analytic on a disc of radius `ρ > r` about c with `|f| ≤ M_ρ` there (for functions with known singularities: log, atan, 1/(1−x)) |

So yes — the "error from the next term" works, but only under the alternating or
ratio hypotheses; Lagrange needs a derivative bound. The library should make
the rule an explicit choice and report which one was used.

### 2.3 Operations

With `T_f = (P, I)` and `T_g = (Q, J)` on the same domain:

- **±**: `(P ± Q, I ± J)`.
- **×**: `P·Q` truncated to the order; the dropped high-degree part is bounded
  on D (polynomial range bound) and added to `P·J + Q·I + I·J`.
- **Range bound of a polynomial on D** (used everywhere): Horner in interval
  arithmetic is valid but loose; better: shift to the centre and use the
  Bernstein form (coefficients bound the range on `[a, b]`), refining by
  subdivision until a width budget is met.
- **Composition `f ∘ g`**: model `g` on D, bound its range `R_g`, model `f` on a
  domain containing `R_g` (re-centred at `g(c)`), then substitute: polynomial
  composition truncated, remainders propagated through the multiplication
  rules. Domain checks fall out naturally (`log(1+g)` requires `R_g ⊂ (−1, ∞)`).
- **Reciprocal / division**: `1/g` = compose `1/(1+u)` (a geometric/Cauchy
  model, valid when the range of `u` stays inside `(−1, 1)` after scaling by
  `g(c)`), then multiply.
- **Integration** `∫_c^x f`: integrate `P` exactly; remainder becomes
  `I · [min(x − c), max(x − c)]` over D. Definite integrals over D are
  therefore certified intervals (exact when `I = 0`).
- **Differentiation**: `P'` is exact, but the remainder of a derivative is not
  determined by `I` alone. Options: (a) re-derive from the function's spec
  (known derivatives of elementary functions, or symbolic differentiation of the
  expression tree, then build a fresh model); (b) a Cauchy estimate when f is
  known analytic on a larger disc. The API should differentiate *expressions*
  and rebuild models, not differentiate models.

### 2.4 ODEs

Initial value problems `y' = F(t, y)`, `y(t0) = y0`, step `[t0, t0 + h]`:

1. Guess an enclosure `Y` of the solution on the step.
2. Picard operator `y0 + ∫_{t0}^t F(s, Y(s)) ds` with Taylor-model arithmetic.
3. If the image lies inside the guess, Banach/Schauder gives a certified
   enclosure; iterate to tighten (this is a validated Taylor-model integrator,
   as in COSY/VNODE-LP); otherwise shrink `h`.
4. Steps chain, with remainders carried forward (and preconditioning to limit
   the wrapping effect for systems).

RiX already has related, separate machinery: the `numerics` plugin's certified
ranges, `calculus` range/derivative checks, and `ode`'s validated Picard
records. The JS library should share algorithms and test fixtures with them
(and could later be the engine those plugins call), not fork the mathematics.

## 3. Package and API sketch

New package `packages/analytic` (`@ratmath/analytic`), depending only on Core.
(It needs its own GitHub repository before it can be a submodule; until then it
can start as a plain folder in the umbrella.)

```js
import { R } from "@ratmath/core";
import { TM, Domain, exp, sin, log1p, ode } from "@ratmath/analytic";

const D = Domain(R`0:1/2`);               // domain, centre at its midpoint unless given
const x = TM.x(D, { order: 12 });
const f = exp(sin(x)).multiply(x);        // Taylor model; remainder certified on D
f.at(R`1/4`);                             // interval enclosing f(1/4)
f.range();                                // interval enclosing f on D
f.integrate().at(R`1/2`);                 // ∫_0^{1/2} f, certified
f.coefficients;                           // exact Rationals
f.describe();                             // rules used, domain checks, widths

const g = TM.series(D, { term: (k) => R`1/${k + 1}`, rule: "ratio", q: R`1/2` });
const y = ode.solve({ f: (t, y) => y.multiply(y).add(t), t0: 0, y0: R`1/2`, until: R`1/2`, order: 10 });
```

Design rules:

- Exact coefficients always; only remainders and ranges are intervals,
  rounded outward.
- Every model carries its domain; operations refuse (with a reason) when a
  hypothesis fails rather than returning a silently invalid bound.
- Budgets everywhere: maximum order, subdivision depth, ODE steps, digits;
  results report when a budget was hit (wide but valid enclosure, never a
  wrong one).
- Results are plain data plus methods so they display in RatCalc's session,
  RatTree's panel and the graphics app identically, with the compact display
  rules already used in RatTree.

## 4. How the apps would use it

| App | Use |
|---|---|
| RatCalc (`apps/calc`, `apps/webcalc`) | `TM`, `exp`, `sin`, `ode` in scope like Core; `help(model)` lists operations |
| RatTree | Functions panel gains "Model" functions: pick a source, domain from the current node (or a user interval), order from `n`/`d`; composition and `∫`/`d/dx` become buttons; Lagrange/explicit modes remain for hand-written series |
| Analytic Graphics app (new) | 2-D plots of explicit `y = f(x)` and implicit `F(x, y) = 0` with certified enclosures: subdivide the plane, use range bounds of models / rational expressions to classify boxes (inside / outside / boundary), draw boundary boxes and certified curve pieces; ODE flows from `ode.solve` |

## 5. Phased plan

1. **Models and ranges**: `Domain`, `TM.x`, constants, ±, ×, polynomial range
   (Bernstein + subdivision), `at`, `range`, `integrate`. Tests against exact
   polynomials and known integrals.
2. **Elementary sources** with checked rules: exp, sin, cos (Lagrange),
   log1p, atan, geometric, binomial (ratio/alternating/Cauchy). Tests against
   30-digit references, as RatTree's tests do now.
3. **Composition and division**, with domain propagation and refusal messages.
4. **Expression front end**: parse `R`-style expressions with function names
   (RatTree's `named-functions.js` evaluator generalises) into expression
   trees; build models; symbolic derivative of trees for `d/dx`.
5. **ODE** single steps, then chained steps; compare with RiX `ode` fixtures.
6. **Integrations**: RatCalc scope and help, RatTree "Model" functions, then
   the Analytic Graphics app (explicit plots first, implicit curves next).

Open questions: default order and centre policy; whether domain should be a
required argument everywhere (recommended) or inferred from use; how much of
this moves into RiX plugins later versus being called by them; numeric budget
defaults for the browser (keep every UI action under ~100 ms, offload long work
to a worker).
