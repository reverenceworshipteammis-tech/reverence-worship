/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("node:child_process");
const electronExecutable = require("electron");

const electronEnvironment = { ...process.env };
delete electronEnvironment.ELECTRON_RUN_AS_NODE;

const child = spawn(electronExecutable, [__dirname, ...process.argv.slice(2)], {
  env: electronEnvironment,
  stdio: "inherit",
  windowsHide: false,
});

child.on("error", (error) => {
  console.error(`Unable to start the Reverence Worship desktop shell: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 0;
});
