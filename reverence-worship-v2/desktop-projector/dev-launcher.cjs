/* eslint-disable @typescript-eslint/no-require-imports */
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");
const { spawn } = require("node:child_process");

const repositoryRoot = path.resolve(__dirname, "..");
const appUrl = process.env.REVERENCE_APP_URL || "http://localhost:3000/admin/music";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const windowsShell = process.platform === "win32";
let webProcess = null;
let desktopProcess = null;
let shuttingDown = false;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function appIsReady() {
  return new Promise((resolve) => {
    const target = new URL(appUrl);
    const request = (target.protocol === "https:" ? https : http).get(target, (response) => {
      response.resume();
      resolve(Boolean(response.statusCode && response.statusCode < 500));
    });
    request.setTimeout(1500, () => request.destroy());
    request.on("error", () => resolve(false));
  });
}

function stopProcessTree(child) {
  if (!child?.pid || child.killed) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore", windowsHide: true });
  } else {
    child.kill("SIGTERM");
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  stopProcessTree(desktopProcess);
  stopProcessTree(webProcess);
  process.exitCode = exitCode;
}

async function run() {
  if (!(await appIsReady())) {
    webProcess = spawn(npmCommand, ["run", "dev"], {
      cwd: repositoryRoot,
      env: process.env,
      shell: windowsShell,
      stdio: "inherit",
    });

    const deadline = Date.now() + 120_000;
    while (!(await appIsReady())) {
      if (webProcess.exitCode !== null) throw new Error("The Reverence Worship web server stopped before it became ready.");
      if (Date.now() >= deadline) throw new Error("Timed out waiting for Reverence Worship at http://localhost:3000.");
      await wait(500);
    }
  }

  desktopProcess = spawn(npmCommand, ["start", "--prefix", "desktop-projector"], {
    cwd: repositoryRoot,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "", REVERENCE_APP_URL: appUrl },
    shell: windowsShell,
    stdio: "inherit",
  });
  desktopProcess.on("exit", (code) => shutdown(code ?? 0));
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("uncaughtException", (error) => {
  console.error(error instanceof Error ? error.message : error);
  shutdown(1);
});

void run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  shutdown(1);
});
