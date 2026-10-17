# Immutable plugin operator metadata cache

**Promoted:** RiX commit `e7381fe` now contains the cache. See
[production validation and broader results](production/README.md). The measurements
below describe the preceding isolated experiment. The builder can still reconstruct
an uncached control from current production, entirely within its copied sources.

Experimental copied RiX only; production source and core arithmetic are unchanged.
Bun 1.4.3 / Node 26.12.0, Apple M4 Pro / macOS ARM64, October 17, 2026.

## Result

The same **358 focused RiX tests passed in 52.73 seconds without the cache and
4.15 seconds with it: 12.7× faster**. These were separate, sequential Bun test
processes with the identical test list and byte-identical core. Another 50
poly/stats/linalg plugin tests passed with the cache in 10.03 seconds; that group
has no paired uncached timing. All 559 core tests passed in 1.25 seconds.
These are single paired suite runs, not a prediction for every test profile.

| Runtime | Baseline cold context ms | Cached cold context ms | Baseline warm context ms | Cached warm context ms | Warm speedup |
|---|---:|---:|---:|---:|---:|
| Bun | 304.51 | 301.83 | 271.83 | 2.15 | 126.4× |
| Node | 221.58 | 221.22 | 193.50 | 1.95 | 99.4× |

Warm samples construct **fresh contexts, registries and catalogs**. They do not
reuse live sessions. Each environment measures one cold context and nine warm
samples; imports are reported separately. Trivial evaluations with fresh defaults
also improve to about 2.5–2.8 ms after warming. **First construction remains
roughly unchanged**: this cache amortizes parsing within a process. Separate
workers/processes each pay their first parse. A source/version-checked build-time
metadata artifact would be a separate experiment for cold-start performance.

## What is cached

`PluginCatalog.addMetadata` previously tokenized each whole RiX plugin source
again when extracting its custom operator declarations for a fresh catalog.
Only that extraction call changes in the copied catalog. The module-local helper
caches successful parser output keyed by exact source text, source label, plugin
ID and mount. Parser configuration/version is fixed by the module instance.

The internal array and declaration records are frozen. Every consumer receives
a fresh mutable array containing freshly cloned, frozen records, matching the
parser's original record mutability. Callers cannot modify the retained cache
through a catalog entry. No namespace, callable, permission, registry, loaded
flag, installer, capability or other live session state is shared by the cache.
Original metadata validation, duplicate/collision checks and activation still run.
Explicitly supplied operator definitions continue through their original path.

The cache has an LRU cap of 128 entries and a 16 MiB estimated UTF-16 key/value
payload budget (engine/container overhead is additional). The 37 bundled RiX
sources retain about 3.74 MiB of estimated payload. Oversized entries bypass
storage; parser failures are never cached. Invalid unusual owner values bypass
key coercion. Source, owner, mount or diagnostic label changes get distinct keys.

## Validation and promotion

- 27 focused invariant/isolation checks pass independently in Bun and Node:
  fresh/frozen declarations, mutation isolation, source/owner/mount/label changes,
  parser errors and diagnostics, eviction/size bounds, explicit definitions,
  duplicate/collision rejection, preconfigured host catalog entries and separate
  plugin loaded state.
- The paired suite includes methods, custom operators, semantic/type behavior,
  cells/identity, numeric/range behavior, async callbacks, returns, notation,
  diagnostics, plugin catalog and parser custom-operator tests.
- `review.js` confirms current production sources are unchanged, both copied
  cores are identical, and only two copied RiX files differ: the catalog call
  site and its new helper.

**This is the strongest next production RiX candidate from this follow-up.** It
solves repeated work without changing mathematical execution. A production PR
should retain these bounds/isolation checks and run the broader integration
profiles. It does not belong in arithmetic core. Existing production files have
not been patched by this experiment.

## Reproduce

From the repository root:

```sh
node compiler-experiments/metadata-cache/build.js
bun compiler-experiments/metadata-cache/verify.js
node compiler-experiments/metadata-cache/verify.js
node compiler-experiments/metadata-cache/tests.js
bun compiler-experiments/metadata-cache/bench.js
node compiler-experiments/metadata-cache/bench.js
node compiler-experiments/metadata-cache/review.js
```

Set `RATMATH_ROOT` when building from another location. Build replaces only this
experiment's ignored `tmp/baseline` and `tmp/cached` trees and uses existing local
dependencies. Run timed processes sequentially after tests. The builder records
source SHA-256 inventories and the loader checks copied core class identity.
See `results/tests.json`, captured test logs, `setup-*.json`,
`verification-*.json` and `source-review.json` for raw evidence.
