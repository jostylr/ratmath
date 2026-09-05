# RatMath

This is an umbrella repo tracking various parts of the RatMath ecosystem. RatMath is an attempt to explore rational mathematics and implement real numbers as rational interval families, specifically in an oracle fashion. 

The various parts are: 

## Documentation

- [Language Guide](docs/LANGUAGE_GUIDE.md): Detailed guide on variables, functions, scoping, and strictness rules.
- [JS Integration](docs/JS_INTEGRATION.md): How to integrate JS modules.

## Workspace setup

The repository standardizes on Bun 1.4 through both `.bun-version` and the
root `packageManager` field. Git submodules and Bun workspaces solve different
problems: the submodule revisions define the compatible integration set, while
Bun links packages at those checked-out revisions. A workspace install does not
move a submodule to a newer commit.

Use the read-only check in automation or before changing anything:

```sh
bun run prep:check
```

Use `bun run prep` in a terminal for the guided version. It reports each
umbrella revision, checkout, branch, cached ahead/behind state, and dirty files.
It asks before restoring any clean submodule to its compatible pin and refuses
to change dirty repositories. For clean branch checkouts, it can then fetch
remote refs and offer only a fast-forward update, with a separate confirmation
for each repository; such an update deliberately appears as a changed
submodule revision for review in the umbrella. It separately asks before
running locked dependency installs.

## Test profiles

Run these commands from the umbrella root:

```sh
bun run test:short          # broad edit loop, 29.7 seconds on the reference run
bun run test:ten            # medium confidence, targeted at five to ten minutes
bun run test:suite          # every Bun test in every relevant repository
bun run test:plugin plot    # one RiX plugin and the tests that load it
```

`bun run test` is an alias for `test:suite`. Direct `bun test` remains the
comprehensive automatic-discovery check; the root `bunfig.toml` only excludes
the ignored `tmp/` diagnostics directory. The named profiles are preferable in
scripts because they execute repositories sequentially and identify the one
that failed.
