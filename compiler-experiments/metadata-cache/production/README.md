# Production RiX promotion — October 17, 2026

RiX commit **`e7381fe`** promotes the immutable metadata cache. Only source-derived
operator declarations are cached. The public RiX capability surface is unchanged;
`.exactLoop` remains an experimental host capability.

The commit includes the internal helper, catalog wiring, nine focused tests,
short-profile registration, plugin-catalog documentation, a changelog entry and
regenerated browser assets. It does not include the other existing uncommitted
RiX changes. Every staged file was checked byte-for-byte against a clean
HEAD-plus-cache snapshot before committing. Browser assets were built separately
for that clean commit and the current working tree; original generated edits were
backed up and a hash-guarded installation preserved current source changes.

## Verification

| Check | Result |
|---|---|
| Actual production working-tree CI profile | **2,213 pass, 0 fail**, 96 files, 59.67 s |
| Clean HEAD-plus-cache full suite | **3,677 pass, 2 environment failures**, 246 files, 545.93 s |
| Both environment-dependent files rerun with the required local access/configuration | **13 pass, 0 fail** |
| Node 26.12.0 portable runtime contracts | Passed |
| Bun 1.4.3 portable runtime contracts | Passed |
| Production generated plugin/live-runtime asset checks | Passed |
| New cache-only regression module | **9 pass, 50 assertions** |
| Direct-loop checks after rebuilding controls against the promoted cache | **115 checks each in Bun and Node**, still experimental |

The full-suite command initially exited nonzero. One test could not bind its
loopback HTTP/WebSocket server inside the restricted runner. Another encountered
an ImageMagick installation with no discoverable default font. The complete
`async-stream-local-fixtures` and `renderer-export` files passed when rerun with
local server access and a task-local font mapping to the installed macOS
Helvetica font. No renderer/server test or production source was changed to hide
these failures. The full suite was not repeated after those targeted reruns.

Portability checks include modules, plugins, async/cancellation, CLI/REPL, editor
workers, PDF/PNG output and static/live publication. Raw outputs and command/exit
records are in [results](results/summary.json). The font mapping in `fontconfig/`
is a local macOS test-environment aid, not a production setting.

## Reproduce

From `rix/` in a normal local test environment:

```sh
bun run test:ci
bun run test:suite
node scripts/check-portable-runtime.js
bun scripts/check-portable-runtime.js
node scripts/generate-plugin-sources.js --check
node scripts/build-live-runtime.js --check
```

If the local ImageMagick installation cannot locate a default font, scope
`MAGICK_CONFIGURE_PATH` to the included `fontconfig/` directory for the renderer
check (its font path is macOS-specific). Loopback tests need permission to bind
local HTTP/WebSocket sockets. Existing uncommitted source changes were preserved;
the full clean snapshot validates the cache commit independently of them.

The experiment builder now recognizes the promoted cache. Its uncached control
reverses only that catalog call in copied sources; the cached control retains
the historical experimental helper. Earlier benchmark reports remain historical.
