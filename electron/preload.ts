import { contextBridge, ipcRenderer } from "electron";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args)
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
});

// Expose NFC-specific API
contextBridge.exposeInMainWorld("nfcAPI", {
  getCurrentCard: () => ipcRenderer.invoke("get-current-card"),
  getNFCStatus: () => ipcRenderer.invoke("get-nfc-status"),
  reconnectNFC: () => ipcRenderer.invoke("reconnect-nfc"),
  sendCommand: (command: string) =>
    ipcRenderer.invoke("send-nfc-command", command),
  hideToTray: () => ipcRenderer.invoke("hide-to-tray"),

  // Event listeners
  onCardDetected: (callback: (cardData: any) => void) => {
    ipcRenderer.on("nfc-card-data", (_, cardData) => callback(cardData));
  },
  onNFCStatusChange: (callback: (status: any) => void) => {
    ipcRenderer.on("nfc-status", (_, status) => callback(status));
  },
  onApplicationLaunched: (callback: (data: any) => void) => {
    ipcRenderer.on("application-launched", (_, data) => callback(data));
  },
  onLaunchError: (callback: (data: any) => void) => {
    ipcRenderer.on("launch-error", (_, data) => callback(data));
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Expose window control API
contextBridge.exposeInMainWorld("windowAPI", {
  minimize: () => ipcRenderer.invoke("window-minimize"),
  maximize: () => ipcRenderer.invoke("window-maximize"),
  close: () => ipcRenderer.invoke("window-close"),
  isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
});
