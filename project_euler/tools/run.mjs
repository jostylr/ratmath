#!/usr/bin/env bun
// Run RiX notebooks (Markdown notes with ```rix cells) headlessly with the
// same engine RiX Notebook uses, print each statement's result, and fail on
// any error. Answers are guarded by `##@ == value` assertions in the notes.
//
//   bun tools/run.mjs                 # every note listed in Problems/notebook.toml
//   bun tools/run.mjs Problems/001-*.md [--quiet]
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nb = resolve(root, "..", "rix-nb", "webview", "source");
const { createRixNotebookEngine } = await import(join(nb, "notebook-web", "rix-engine.js"));
const { createNotebookBundledPluginCatalog } = await import(join(nb, "bundled-plugin-catalog.js"));

const args = process.argv.slice(2);
const quiet = args.includes("--quiet");
let files = args.filter((arg) => !arg.startsWith("--")).map((file) => resolve(file));
if (!files.length) {
  const dir = join(root, "Problems");
  files = readdirSync(dir).filter((name) => /^\d+.*\.md$/.test(name)).sort().map((name) => join(dir, name));
}

let failed = 0;
for (const file of files) {
  const source = readFileSync(file, "utf8");
  const engine = createRixNotebookEngine({ pluginCatalog: createNotebookBundledPluginCatalog() });
  const started = performance.now();
  const run = engine.executeDocument(source);
  const seconds = ((performance.now() - started) / 1000).toFixed(2);
  const errors = run.outputStatements.filter(({ kind }) => kind === "error");
  if (!quiet) for (const statement of run.outputStatements) {
    const code = statement.code.replace(/\s+/g, " ");
    console.log(`  ${statement.kind === "error" ? "✗" : " "} L${statement.line}: ${code.length > 70 ? `${code.slice(0, 67)}...` : code}\n      => ${statement.content}`);
  }
  const results = run.outputStatements.filter(({ kind }) => kind === "result");
  const last = results.at(-1)?.content;
  const ok = errors.length === 0;
  if (!ok) failed += 1;
  const name = file.slice(root.length + 1);
  console.log(`${ok ? "PASS" : "FAIL"} ${name} (${run.runs.length} cells, ${seconds}s)` +
    (last === undefined ? "" : ` answer ${last}`));
  for (const error of errors) console.log(`     error L${error.line}: ${error.content}`);
}
process.exit(failed ? 1 : 0);
