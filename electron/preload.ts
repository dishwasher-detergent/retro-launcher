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

// Expose ESP32 device detection API
contextBridge.exposeInMainWorld("esp32API", {
  getDevices: () => ipcRenderer.invoke("esp32-get-devices"),
  hasDevices: () => ipcRenderer.invoke("esp32-has-devices"),
  testDevice: (devicePath: string) =>
    ipcRenderer.invoke("esp32-test-device", devicePath),
  startPolling: () => ipcRenderer.invoke("esp32-start-polling"),
  stopPolling: () => ipcRenderer.invoke("esp32-stop-polling"),

  // Event listeners
  onDeviceConnected: (callback: (device: any) => void) => {
    ipcRenderer.on("esp32-device-connected", (_event, device) =>
      callback(device)
    );
  },
  onDeviceDisconnected: (callback: (device: any) => void) => {
    ipcRenderer.on("esp32-device-disconnected", (_event, device) =>
      callback(device)
    );
  },
  onScanError: (callback: (error: any) => void) => {
    ipcRenderer.on("esp32-scan-error", (_event, error) => callback(error));
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
