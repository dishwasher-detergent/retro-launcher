"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(
      channel,
      (event, ...args2) => listener(event, ...args2)
    );
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
});
electron.contextBridge.exposeInMainWorld("nfcAPI", {
  getCurrentCard: () => electron.ipcRenderer.invoke("get-current-card"),
  getNFCStatus: () => electron.ipcRenderer.invoke("get-nfc-status"),
  reconnectNFC: () => electron.ipcRenderer.invoke("reconnect-nfc"),
  sendCommand: (command) => electron.ipcRenderer.invoke("send-nfc-command", command),
  hideToTray: () => electron.ipcRenderer.invoke("hide-to-tray"),
  // Event listeners
  onCardDetected: (callback) => {
    electron.ipcRenderer.on("nfc-card-data", (_, cardData) => callback(cardData));
  },
  onNFCStatusChange: (callback) => {
    electron.ipcRenderer.on("nfc-status", (_, status) => callback(status));
  },
  onApplicationLaunched: (callback) => {
    electron.ipcRenderer.on("application-launched", (_, data) => callback(data));
  },
  onLaunchError: (callback) => {
    electron.ipcRenderer.on("launch-error", (_, data) => callback(data));
  },
  // Remove listeners
  removeAllListeners: (channel) => {
    electron.ipcRenderer.removeAllListeners(channel);
  }
});
