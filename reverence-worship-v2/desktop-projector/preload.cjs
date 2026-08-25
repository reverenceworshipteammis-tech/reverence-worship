/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("reverenceDesktop", {
  listDisplays: () => ipcRenderer.invoke("projection:list-displays"),
  openProjector: (options) => ipcRenderer.invoke("projection:open", {
    url: typeof options?.url === "string" ? options.url : "",
    displayId: typeof options?.displayId === "string" ? options.displayId : undefined,
  }),
  closeProjector: () => ipcRenderer.invoke("projection:close"),
});
