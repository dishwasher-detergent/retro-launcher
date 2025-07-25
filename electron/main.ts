import { app, BrowserWindow, globalShortcut, ipcMain, Menu } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DeviceInfo, DeviceService } from "./services/device.service";
import { LauncherService } from "./services/launcher.service";
import { TrayService } from "./services/tray.service";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Global variables
let win: BrowserWindow | null;
let trayService: TrayService;
let deviceService: DeviceService;
let launcherService: LauncherService;
let isQuiting = false;

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "Web/icon-48x48.png"),
    width: 600,
    height: 550,
    minWidth: 600,
    minHeight: 550,
    show: true,
    frame: false,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  win.on("close", (event) => {
    if (!isQuiting) {
      event.preventDefault();
      win?.hide();

      if (trayService) {
        trayService.showNotification(
          "Retro Launcher",
          "App was minimized to tray. Click the tray icon to restore."
        );
      }
      return false;
    }
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  win.webContents.openDevTools();
}

function initializeServices() {
  trayService = new TrayService({
    quitApp: () => {
      isQuiting = true;
      app.quit();
    },
    navigateToHome: () => {
      if (win) {
        win.show();
        win.focus();
        win.webContents.send("navigate-to", "/");
      }
    },
    navigateToWriter: () => {
      if (win) {
        win.show();
        win.focus();
        win.webContents.send("navigate-to", "/writer");
      }
    },
    navigateToLogs: () => {
      if (win) {
        win.show();
        win.focus();
        win.webContents.send("navigate-to", "/logs");
      }
    },
  });

  trayService.initializeTray(process.env.VITE_PUBLIC || "");

  deviceService = new DeviceService();
  launcherService = new LauncherService();

  const initialSelectedDevice = deviceService.getSelectedDevice();
  trayService.updateDeviceStatus(initialSelectedDevice ? 1 : 0);

  deviceService.on("deviceConnected", (deviceInfo: DeviceInfo) => {
    if (win) {
      win.webContents.send("device-connected", deviceInfo);
    }
  });

  deviceService.on("deviceDisconnected", (deviceInfo: DeviceInfo) => {
    if (win) {
      win.webContents.send("device-disconnected", deviceInfo);
    }
  });

  deviceService.on("scanError", (error: any) => {
    if (win) {
      win.webContents.send("device-scan-error", error);
    }
  });

  deviceService.on("selectedDeviceChanged", (deviceInfo: DeviceInfo | null) => {
    if (win) {
      win.webContents.send("selected-device-changed", deviceInfo);
    }
    trayService.updateDeviceStatus(deviceInfo ? 1 : 0);
  });

  deviceService.on("cartridgeDetected", (cartridgeData: string) => {
    if (win) {
      win.webContents.send("cartridge-detected", cartridgeData);
    }
  });

  deviceService.on("cartridgeRemoved", () => {
    if (win) {
      win.webContents.send("cartridge-removed");
    }
  });

  deviceService.on("nfcError", (error: any) => {
    if (win) {
      win.webContents.send("nfc-error", error);
    }
  });

  deviceService.on("connectionError", (error: any) => {
    if (win) {
      win.webContents.send("cartridge-connection-error", error);
    }
  });

  launcherService.on("applicationLaunched", () => {
    if (win) {
      win.webContents.send("application-launched");
    }
  });

  launcherService.on("launchError", (data) => {
    if (win) {
      win.webContents.send("application-launch-error", data);
    }
  });
}

function setupIPCHandlers() {
  ipcMain.handle("hide-to-tray", () => {
    if (win) {
      win.hide();
    }
    return { success: true };
  });

  ipcMain.handle("extract-exe-icon", async (_, filePath: string) => {
    try {
      const icon = await app.getFileIcon(filePath, { size: "normal" });
      const iconDataUrl = icon.toDataURL();
      return { success: true, icon: iconDataUrl };
    } catch (error) {
      console.error("Failed to extract icon:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle("window-minimize", () => {
    if (win) {
      win.minimize();
    }
    return { success: true };
  });

  ipcMain.handle("window-maximize", () => {
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
    return { success: true };
  });

  ipcMain.handle("window-close", () => {
    if (win) {
      win.close();
    }
    return { success: true };
  });

  ipcMain.handle("window-is-maximized", () => {
    if (win) {
      return win.isMaximized();
    }
    return false;
  });

  ipcMain.handle("test-device", async (_, devicePath: string) => {
    if (deviceService) {
      try {
        const isResponsive = await deviceService.validateDevice(devicePath);
        return { success: true, responsive: isResponsive };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: errorMessage };
      }
    }
    return { success: false, error: "Device service not available" };
  });

  ipcMain.handle("get-selected-device", () => {
    if (deviceService) {
      return deviceService.getSelectedDevice();
    }
    return null;
  });

  ipcMain.handle("set-selected-device", (_, deviceInfo: DeviceInfo | null) => {
    if (deviceService) {
      deviceService.setSelectedDevice(deviceInfo);
      return { success: true };
    }
    return { success: false, error: "Device service not available" };
  });

  ipcMain.handle("get-last-cartridge", () => {
    if (deviceService) {
      return deviceService.getLastCartridge();
    }
    return null;
  });

  ipcMain.handle("send-cartridge-command", async (_, command: string) => {
    if (deviceService) {
      try {
        await deviceService.sendCommand(command);
        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: errorMessage };
      }
    }
    return { success: false, error: "Device service not available" };
  });

  ipcMain.handle("has-connected-device", () => {
    if (deviceService) {
      return deviceService.hasConnectedDevice();
    }
    return false;
  });

  ipcMain.handle("get-connected-device", () => {
    if (deviceService) {
      return deviceService.getConnectedDevice();
    }
    return null;
  });

  ipcMain.handle("launch-cartridge", async (_, cartridgePath: string) => {
    if (deviceService) {
      try {
        await launcherService.launchApplication(cartridgePath);
        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: errorMessage };
      }
    }
    return { success: false, error: "Device service not available" };
  });
}

app.on("before-quit", () => {
  isQuiting = true;
});

app.on("will-quit", () => {
  // Cleanup global shortcuts
  globalShortcut.unregisterAll();

  // Cleanup services
  if (trayService) {
    trayService.cleanup();
  }

  if (deviceService) {
    deviceService.destroy();
  }
});

app.whenReady().then(() => {
  // Remove the default application menu (File, Edit, View, etc.)
  Menu.setApplicationMenu(null);

  // Setup IPC handlers first, before creating the window
  setupIPCHandlers();

  createWindow();
  initializeServices();
});
