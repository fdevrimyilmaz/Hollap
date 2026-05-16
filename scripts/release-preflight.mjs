import { execFileSync } from "node:child_process";

function runGitRaw(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runGit(args) {
  return runGitRaw(args).trim();
}

function getStatusSummary() {
  const statusOutput = runGitRaw(["status", "--short"]);
  const lines = statusOutput
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  const untracked = lines.filter((line) => line.startsWith("?? ")).length;
  const modified = lines.length - untracked;

  return {
    lines,
    modified,
    untracked,
  };
}

function getTagsOnHead() {
  const raw = runGit(["tag", "--points-at", "HEAD"]);
  return raw
    .split(/\r?\n/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function fail(message) {
  console.error(`Release preflight failed: ${message}`);
  process.exitCode = 1;
}

function main() {
  try {
    runGit(["rev-parse", "--is-inside-work-tree"]);
    runGit(["rev-parse", "--verify", "HEAD"]);
  } catch {
    fail("not inside a valid Git repository with at least one commit.");
    return;
  }

  const status = getStatusSummary();
  if (status.lines.length > 0) {
    console.error(
      `Release preflight failed: working tree is dirty (modified: ${status.modified}, untracked: ${status.untracked}).`
    );
    console.error("Commit or stash changes before creating a release.");
    console.error("");
    console.error("Current changes:");
    for (const line of status.lines) {
      console.error(line);
    }
    process.exitCode = 1;
    return;
  }

  const tags = getTagsOnHead();
  if (!tags.length) {
    fail("no tag points at HEAD. Create a release tag first (example: npm run release:tag -- v0.1.0).");
    return;
  }

  const commit = runGit(["rev-parse", "--short", "HEAD"]);
  console.log(`Release preflight passed on commit ${commit}.`);
  console.log(`Tags on HEAD: ${tags.join(", ")}`);
}

main();
