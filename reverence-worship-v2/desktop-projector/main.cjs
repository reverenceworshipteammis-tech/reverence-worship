/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path");
const { app, BrowserWindow, ipcMain, powerSaveBlocker, screen, session } = require("electron");

const commandUrl = process.argv.find((argument) => argument.startsWith("--url="))?.slice(6);
const appUrl = commandUrl || process.env.REVERENCE_APP_URL || "http://localhost:3000/admin/music";
const appOrigin = new URL(appUrl).origin;
let operatorWindow = null;
let projectorWindow = null;
let displaySleepBlocker = null;

function trustedSender(event) {
  try {
    return new URL(event.senderFrame?.url || event.sender.getURL()).origin === appOrigin;
  } catch {
    return false;
  }
}

function displayData(display) {
  return {
    id: String(display.id),
    label: display.label || `Display ${display.id}`,
    availLeft: display.workArea.x,
    availTop: display.workArea.y,
    availWidth: display.workArea.width,
    availHeight: display.workArea.height,
    width: display.bounds.width,
    height: display.bounds.height,
    isPrimary: display.id === screen.getPrimaryDisplay().id,
    isInternal: Boolean(display.internal),
  };
}

function targetDisplay(displayId) {
  const displays = screen.getAllDisplays();
  return displays.find((display) => String(display.id) === displayId)
    || displays.find((display) => !display.internal && display.id !== screen.getPrimaryDisplay().id)
    || displays.find((display) => display.id !== screen.getPrimaryDisplay().id)
    || screen.getPrimaryDisplay();
}

function validProjectionUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === appOrigin && url.pathname === "/projection/output" ? url.toString() : null;
  } catch {
    return null;
  }
}

function closeProjector() {
  if (projectorWindow && !projectorWindow.isDestroyed()) projectorWindow.close();
  projectorWindow = null;
  if (displaySleepBlocker !== null && powerSaveBlocker.isStarted(displaySleepBlocker)) powerSaveBlocker.stop(displaySleepBlocker);
  displaySleepBlocker = null;
}

async function openProjector(url, displayId) {
  const display = targetDisplay(displayId);
  const nativeProjectionUrl = new URL(url);
  nativeProjectionUrl.searchParams.set("shell", "desktop");
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.setBounds(display.bounds);
    projectorWindow.setFullScreen(true);
    projectorWindow.showInactive();
    operatorWindow?.focus();
    return { ok: true };
  }

  projectorWindow = new BrowserWindow({
    ...display.bounds,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#000000",
    fullscreen: true,
    fullscreenable: true,
    skipTaskbar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: "persist:reverence-worship",
    },
  });
  projectorWindow.setMenuBarVisibility(false);
  projectorWindow.setAlwaysOnTop(true, "screen-saver");
  if (displaySleepBlocker === null) displaySleepBlocker = powerSaveBlocker.start("prevent-display-sleep");
  projectorWindow.on("closed", () => {
    projectorWindow = null;
    if (displaySleepBlocker !== null && powerSaveBlocker.isStarted(displaySleepBlocker)) powerSaveBlocker.stop(displaySleepBlocker);
    displaySleepBlocker = null;
  });
  projectorWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    if (validProjectionUrl(navigationUrl) === null) event.preventDefault();
  });
  projectorWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  projectorWindow.once("ready-to-show", () => {
    projectorWindow?.setBounds(display.bounds);
    projectorWindow?.setFullScreen(true);
    projectorWindow?.showInactive();
    operatorWindow?.focus();
  });
  await projectorWindow.loadURL(nativeProjectionUrl.toString());
  return { ok: true };
}

function createOperatorWindow() {
  operatorWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: "persist:reverence-worship",
    },
  });
  operatorWindow.setMenuBarVisibility(false);
  operatorWindow.once("ready-to-show", () => operatorWindow?.show());
  operatorWindow.webContents.setWindowOpenHandler(({ url }) => {
    const projectionUrl = validProjectionUrl(url);
    if (projectionUrl) {
      void openProjector(projectionUrl);
      return { action: "deny" };
    }
    return { action: "deny" };
  });
  operatorWindow.on("closed", () => {
    operatorWindow = null;
    closeProjector();
  });
  void operatorWindow.loadURL(appUrl);
}

app.whenReady().then(() => {
  session.fromPartition("persist:reverence-worship").setPermissionRequestHandler((webContents, permission, callback) => {
    let trusted = false;
    try { trusted = new URL(webContents.getURL()).origin === appOrigin; } catch { trusted = false; }
    callback(trusted && ["fullscreen", "notifications", "window-management"].includes(permission));
  });

  ipcMain.handle("projection:list-displays", (event) => {
    if (!trustedSender(event)) return [];
    return screen.getAllDisplays().map(displayData);
  });
  ipcMain.handle("projection:open", async (event, options) => {
    if (!trustedSender(event)) return { ok: false, message: "Untrusted projection request." };
    const url = validProjectionUrl(options?.url);
    if (!url) return { ok: false, message: "Invalid projector output URL." };
    try {
      return await openProjector(url, typeof options?.displayId === "string" ? options.displayId : undefined);
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Projector window failed to open." };
    }
  });
  ipcMain.handle("projection:close", (event) => {
    if (trustedSender(event)) closeProjector();
  });

  createOperatorWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createOperatorWindow(); });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
