#!/usr/bin/env bun

import path from "node:path";

const workspaceRoot = path.resolve(import.meta.dir, "..");
const profile = process.argv[2];
const profileArgs = process.argv.slice(3);

const educationShortTests = [
    "tests/activity",
    "tests/contracts",
    "tests/player",
    "tests/publishing",
    "tests/course/adult-support.test.js",
    "tests/course/answer-normalization.test.js",
    "tests/course/config-practice.test.js",
    "tests/course/course-home.test.js",
    "tests/course/dedicated-practice.test.js",
    "tests/course/first-lesson-practice.test.js",
    "tests/course/learner-help.test.js",
    "tests/course/practice-player.test.js",
];

// This file is fast alone but leaves enough shared fake-timer state to make a
// combined RiX-Ed process linger for roughly 100 seconds. Keep the coverage,
// isolate the process.
const educationIsolatedTests = ["tests/course/whiteboard.test.js"];
const educationSuiteTests = [
    ...educationShortTests,
    "tests/courses",
    "tests/physics-examples.test.js",
];

const profiles = {
    short: [
        ["Legacy RatMath packages and apps", ".", ["test", "--dots", "apps", "packages"]],
        ["RiX focused tests", "rix", ["run", "test:short"]],
        ["RiX-Web focused tests", "rix-web", ["run", "test:short"]],
        ["RiX-NB focused tests", "rix-nb", ["run", "test:short"]],
        ["RiX-Ed focused tests", "rix-ed", ["test", "--dots", ...educationShortTests]],
        ["RiX-Ed isolated whiteboard test", "rix-ed", ["test", "--dots", ...educationIsolatedTests]],
    ],
    ten: [
        ["Legacy RatMath packages and apps", ".", ["test", "--dots", "apps", "packages"]],
        ["RiX medium tests", "rix", ["run", "test:ten"]],
        ["RiX-Web focused tests", "rix-web", ["run", "test:short"]],
        ["RiX-NB focused tests", "rix-nb", ["run", "test:short"]],
        ["RiX-Ed focused tests", "rix-ed", ["test", "--dots", ...educationShortTests]],
        ["RiX-Ed isolated whiteboard test", "rix-ed", ["test", "--dots", ...educationIsolatedTests]],
    ],
    suite: [
        ["Legacy RatMath packages and apps", ".", ["test", "--dots", "apps", "packages"]],
        ["RiX complete suite", "rix", ["run", "test:suite"]],
        ["RiX-Web complete suite", "rix-web", ["run", "test:suite"]],
        ["RiX-NB complete suite", "rix-nb", ["run", "test:suite"]],
        ["RiX-Ed complete suite", "rix-ed", ["test", "--dots", ...educationSuiteTests]],
        ["RiX-Ed isolated whiteboard test", "rix-ed", ["test", "--dots", ...educationIsolatedTests]],
    ],
};

function run(label, directory, args) {
    console.log(`\n=== ${label} ===`);
    const result = Bun.spawnSync([process.execPath, ...args], {
        cwd: path.join(workspaceRoot, directory),
        env: process.env,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
    });
    if (result.exitCode !== 0) {
        console.error(`\n${label} failed with exit code ${result.exitCode}.`);
    }
    return result.exitCode;
}

if (profile === "plugin") {
    if (!profileArgs[0]) {
        console.error("Usage: bun run test:plugin <plugin-name> [bun test flags]");
        process.exit(2);
    }
    process.exit(run(
        `RiX plugin: ${profileArgs[0]}`,
        "rix",
        ["run", "test:plugin", ...profileArgs],
    ));
}

const tasks = profiles[profile];
if (!tasks) {
    console.error("Usage: bun scripts/run-workspace-tests.js <short|ten|suite|plugin>");
    process.exit(2);
}

const started = performance.now();
for (const [label, directory, args] of tasks) {
    const exitCode = run(label, directory, args);
    if (exitCode !== 0) process.exit(exitCode);
}

console.log(`\n${profile} workspace profile passed in ${((performance.now() - started) / 1000).toFixed(1)}s.`);
