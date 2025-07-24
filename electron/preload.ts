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

// Expose Electron file operations API
contextBridge.exposeInMainWorld("electronAPI", {
  extractExeIcon: (filePath: string) =>
    ipcRenderer.invoke("extract-exe-icon", filePath),
});

// Expose window control API
contextBridge.exposeInMainWorld("windowAPI", {
  minimize: () => ipcRenderer.invoke("window-minimize"),
  maximize: () => ipcRenderer.invoke("window-maximize"),
  close: () => ipcRenderer.invoke("window-close"),
  isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
});

// Expose device detection API
contextBridge.exposeInMainWorld("deviceApi", {
  getDevices: () => ipcRenderer.invoke("get-devices"),
  hasDevices: () => ipcRenderer.invoke("has-devices"),
  testDevice: (devicePath: string) =>
    ipcRenderer.invoke("test-device", devicePath),
  startPolling: () => ipcRenderer.invoke("start-polling"),
  stopPolling: () => ipcRenderer.invoke("stop-polling"),
  getSelectedDevice: () => ipcRenderer.invoke("get-selected-device"),
  setSelectedDevice: (device: any) =>
    ipcRenderer.invoke("set-selected-device", device),
  hasSelectedDevice: () => ipcRenderer.invoke("has-selected-device"),

  // Event listeners
  onDeviceConnected: (callback: (device: any) => void) => {
    ipcRenderer.on("device-connected", (_event, device) => callback(device));
  },
  onDeviceDisconnected: (callback: (device: any) => void) => {
    ipcRenderer.on("device-disconnected", (_event, device) => callback(device));
  },
  onSelectedDeviceChanged: (callback: (device: any) => void) => {
    ipcRenderer.on("selected-device-changed", (_event, device) =>
      callback(device)
    );
  },
  onScanError: (callback: (error: any) => void) => {
    ipcRenderer.on("device-scan-error", (_event, error) => callback(error));
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Expose cartridge service API
contextBridge.exposeInMainWorld("cartridgeApi", {
  getLastCartridge: () => ipcRenderer.invoke("get-last-cartridge"),
  sendCommand: (command: string) =>
    ipcRenderer.invoke("send-cartridge-command", command),
  requestLastNFC: () => ipcRenderer.invoke("request-last-nfc"),
  writeToCartridge: (data: string) =>
    ipcRenderer.invoke("write-to-cartridge", data),
  hasConnectedDevice: () =>
    ipcRenderer.invoke("has-connected-cartridge-device"),
  getConnectedDevice: () =>
    ipcRenderer.invoke("get-connected-cartridge-device"),

  // Event listeners
  onCartridgeDetected: (callback: (cartridge: any) => void) => {
    ipcRenderer.on("cartridge-detected", (_event, cartridge) =>
      callback(cartridge)
    );
  },
  onNFCError: (callback: (error: any) => void) => {
    ipcRenderer.on("nfc-error", (_event, error) => callback(error));
  },
  onConnectionError: (callback: (error: any) => void) => {
    ipcRenderer.on("cartridge-connection-error", (_event, error) =>
      callback(error)
    );
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
