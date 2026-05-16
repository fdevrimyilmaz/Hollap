import { execFileSync } from "node:child_process";

function runGit(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function statusIsClean() {
  const status = runGit(["status", "--short"]);
  return status.length === 0;
}

function ensureTagFormat(tag) {
  return /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag);
}

function tagExists(tag) {
  try {
    runGit(["rev-parse", "--verify", `refs/tags/${tag}`]);
    return true;
  } catch {
    return false;
  }
}

function fail(message) {
  console.error(`Release tag failed: ${message}`);
  process.exitCode = 1;
}

function main() {
  const tag = process.argv[2]?.trim();

  if (!tag) {
    fail("tag is required. Usage: npm run release:tag -- v0.1.0");
    return;
  }

  if (!ensureTagFormat(tag)) {
    fail("invalid tag format. Use SemVer tags such as v0.1.0 or v0.1.0-rc.1");
    return;
  }

  try {
    runGit(["rev-parse", "--is-inside-work-tree"]);
    runGit(["rev-parse", "--verify", "HEAD"]);
  } catch {
    fail("not inside a valid Git repository with at least one commit.");
    return;
  }

  if (!statusIsClean()) {
    fail("working tree is dirty. Commit or stash changes before tagging.");
    return;
  }

  if (tagExists(tag)) {
    fail(`tag already exists: ${tag}`);
    return;
  }

  execFileSync("git", ["tag", "-a", tag, "-m", `Release ${tag}`], {
    stdio: "inherit",
  });

  const branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"]);

  console.log(`Created annotated tag ${tag}.`);
  if (branch && branch !== "HEAD") {
    console.log(`Next: git push origin ${branch} ${tag}`);
  } else {
    console.log(`Next: git push origin ${tag}`);
  }
}

main();
