#!/usr/bin/env bun

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";

const workspaceRoot = path.resolve(import.meta.dir, "..");
const checkOnly = process.argv.includes("--check");

function command(args, cwd = workspaceRoot) {
    const result = Bun.spawnSync(args, {
        cwd,
        env: process.env,
        stdout: "pipe",
        stderr: "pipe",
    });
    return {
        exitCode: result.exitCode,
        stdout: result.stdout.toString().trim(),
        stderr: result.stderr.toString().trim(),
    };
}

function git(args, cwd = workspaceRoot) {
    return command(["git", ...args], cwd);
}

function submodulePaths() {
    const source = readFileSync(path.join(workspaceRoot, ".gitmodules"), "utf8");
    return [...source.matchAll(/^\s*path\s*=\s*(.+?)\s*$/gm)].map((match) => match[1]);
}

function recordedRevision(submodulePath) {
    const result = git(["ls-tree", "HEAD", "--", submodulePath]);
    return result.stdout.match(/^160000 commit ([0-9a-f]{40})\t/)?.[1] || null;
}

function repositoryState(submodulePath) {
    const directory = path.join(workspaceRoot, submodulePath);
    const recorded = recordedRevision(submodulePath);
    if (!existsSync(directory) || git(["rev-parse", "--git-dir"], directory).exitCode !== 0) {
        return { path: submodulePath, directory, recorded, missing: true };
    }

    const current = git(["rev-parse", "HEAD"], directory).stdout || null;
    const branch = git(["symbolic-ref", "--quiet", "--short", "HEAD"], directory).stdout || "detached";
    const upstreamResult = git(["rev-parse", "--abbrev-ref", "@{upstream}"], directory);
    const upstream = upstreamResult.exitCode === 0 ? upstreamResult.stdout : null;
    let ahead = null;
    let behind = null;
    if (upstream) {
        const counts = git(["rev-list", "--left-right", "--count", `HEAD...${upstream}`], directory).stdout
            .split(/\s+/)
            .map(Number);
        [ahead, behind] = counts;
    }
    const status = git(["status", "--porcelain"], directory).stdout;
    return {
        path: submodulePath,
        directory,
        recorded,
        current,
        branch,
        upstream,
        ahead,
        behind,
        dirty: Boolean(status),
        status,
        missing: false,
    };
}

function short(revision) {
    return revision ? revision.slice(0, 10) : "unknown";
}

function describe(state) {
    if (state.missing) {
        console.log(`\n${state.path}: not initialized (umbrella pin ${short(state.recorded)})`);
        return;
    }
    const pin = state.current === state.recorded ? "aligned" : "DIFFERS FROM UMBRELLA PIN";
    console.log(`\n${state.path}: ${pin}`);
    console.log(`  umbrella: ${short(state.recorded)}`);
    console.log(`  checkout: ${short(state.current)} (${state.branch})`);
    if (state.upstream) {
        console.log(`  upstream: ${state.upstream}; ahead ${state.ahead}, behind ${state.behind} (cached refs)`);
    } else {
        console.log("  upstream: none configured");
    }
    console.log(`  working tree: ${state.dirty ? "DIRTY — prep will not change it" : "clean"}`);
    if (state.dirty) {
        for (const line of state.status.split("\n").slice(0, 8)) console.log(`    ${line}`);
    }
}

function runInherited(args, cwd = workspaceRoot) {
    const result = Bun.spawnSync(args, {
        cwd,
        env: process.env,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
    });
    return result.exitCode;
}

async function prepareDependencies(question) {
    const answer = await question("\nInstall locked dependencies for the umbrella, RiX-NB, and RiX-Ed? [y/N] ");
    if (!/^y(?:es)?$/i.test(answer.trim())) return 0;
    for (const directory of [workspaceRoot, path.join(workspaceRoot, "rix-nb"), path.join(workspaceRoot, "rix-ed")]) {
        if (!existsSync(path.join(directory, "bun.lock"))) continue;
        console.log(`\nPreparing dependencies in ${path.relative(workspaceRoot, directory) || "."}...`);
        const exitCode = runInherited([process.execPath, "ci"], directory);
        if (exitCode !== 0) return exitCode;
    }
    return 0;
}

async function refreshRepository(state, question) {
    if (state.missing || state.dirty || state.branch === "detached" || !state.upstream) return 0;
    const remote = git(["config", "--get", `branch.${state.branch}.remote`], state.directory).stdout;
    if (!remote || remote === ".") return 0;

    const fetchAnswer = await question(
        `Refresh cached upstream refs for ${state.path} from ${remote}? (no checkout change) [y/N] `,
    );
    if (!/^y(?:es)?$/i.test(fetchAnswer.trim())) return 0;
    let exitCode = runInherited(["git", "fetch", "--prune", remote], state.directory);
    if (exitCode !== 0) return exitCode;

    const refreshed = repositoryState(state.path);
    console.log(`  ${refreshed.upstream}: ahead ${refreshed.ahead}, behind ${refreshed.behind}`);
    if (!refreshed.behind) return 0;
    if (refreshed.ahead) {
        console.log(`  Not updating ${state.path}: its branch has diverged; reconcile it manually.`);
        return 0;
    }

    const updateAnswer = await question(
        `Fast-forward ${state.path} by ${refreshed.behind} commit(s) to ${refreshed.upstream}? `
        + "(the umbrella will show a changed submodule revision) [y/N] ",
    );
    if (!/^y(?:es)?$/i.test(updateAnswer.trim())) return 0;
    exitCode = runInherited(["git", "merge", "--ff-only", refreshed.upstream], state.directory);
    return exitCode;
}

const initialStates = submodulePaths().map(repositoryState);
console.log("RatMath workspace preparation");
console.log("Umbrella pins are the compatible integration set; Bun workspaces do not move Git submodules.");
for (const state of initialStates) describe(state);

const hasIssues = initialStates.some((state) => state.missing || state.current !== state.recorded || state.dirty);
if (checkOnly) process.exit(hasIssues ? 1 : 0);

if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error("\nInteractive prep needs a terminal. Use 'bun run prep:check' for read-only automation.");
    process.exit(hasIssues ? 1 : 0);
}

const readline = createInterface({ input: process.stdin, output: process.stdout });
const question = (prompt) => readline.question(prompt);
let exitCode = 0;
try {
    for (const state of initialStates) {
        if (!state.missing && state.current === state.recorded) continue;
        if (state.dirty) {
            console.log(`\nSkipping ${state.path}: commit, stash, or discard its changes yourself first.`);
            continue;
        }
        const action = state.missing ? "Initialize" : "Restore";
        const answer = await question(`${action} ${state.path} to umbrella pin ${short(state.recorded)}? [y/N] `);
        if (!/^y(?:es)?$/i.test(answer.trim())) continue;
        const code = runInherited(["git", "submodule", "update", "--init", "--", state.path]);
        if (code !== 0) {
            exitCode = code;
            break;
        }
    }
    if (exitCode === 0) {
        console.log("\nOptional upstream refresh (clean branch checkouts only):");
        for (const state of submodulePaths().map(repositoryState)) {
            exitCode = await refreshRepository(state, question);
            if (exitCode !== 0) break;
        }
    }
    if (exitCode === 0) exitCode = await prepareDependencies(question);
} finally {
    readline.close();
}

console.log("\nFinal workspace state:");
for (const state of submodulePaths().map(repositoryState)) describe(state);
process.exit(exitCode);
