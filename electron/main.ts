import { app, BrowserWindow, globalShortcut, ipcMain, Menu } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESP32DetectionService, ESP32DeviceInfo } from "./services/index";
import { TrayService } from "./services/tray.service";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Global variables
let win: BrowserWindow | null;
let trayService: TrayService;
let esp32DetectionService: ESP32DetectionService;
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

  win.on("minimize", (event: Electron.Event) => {
    event.preventDefault();
    win?.hide();

    if (trayService) {
      trayService.showNotification(
        "Retro Launcher",
        "App was minimized to tray."
      );
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

  // Initialize ESP32 detection service
  esp32DetectionService = new ESP32DetectionService();

  // Set up ESP32 device event handlers
  esp32DetectionService.on("deviceConnected", (deviceInfo: ESP32DeviceInfo) => {
    console.log("ESP32 device connected:", deviceInfo);

    // Send notification to renderer process
    if (win) {
      win.webContents.send("esp32-device-connected", deviceInfo);
    }

    // Show system notification via tray service
    if (trayService) {
      trayService.showNotification(
        "ESP32 Device Connected",
        `ESP32 device detected on ${deviceInfo.path}`
      );
    }
  });

  esp32DetectionService.on(
    "deviceDisconnected",
    (deviceInfo: ESP32DeviceInfo) => {
      console.log("ESP32 device disconnected:", deviceInfo);

      // Send notification to renderer process
      if (win) {
        win.webContents.send("esp32-device-disconnected", deviceInfo);
      }

      // Show system notification via tray service
      if (trayService) {
        trayService.showNotification(
          "ESP32 Device Disconnected",
          `ESP32 device removed from ${deviceInfo.path}`
        );
      }
    }
  );

  esp32DetectionService.on("scanError", (error: any) => {
    console.error("ESP32 scan error:", error);

    // Send error to renderer process
    if (win) {
      win.webContents.send("esp32-scan-error", error);
    }
  });

  setupIPCHandlers();
}

function setupIPCHandlers() {
  ipcMain.handle("hide-to-tray", () => {
    if (win) {
      win.hide();
    }
    return { success: true };
  });

  // Extract icon from executable file
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

  // Window control handlers
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

  // ESP32 device management handlers
  ipcMain.handle("esp32-get-devices", () => {
    if (esp32DetectionService) {
      return esp32DetectionService.getDetectedDevices();
    }
    return [];
  });

  ipcMain.handle("esp32-has-devices", () => {
    if (esp32DetectionService) {
      return esp32DetectionService.hasConnectedDevices();
    }
    return false;
  });

  ipcMain.handle("esp32-test-device", async (_, devicePath: string) => {
    if (esp32DetectionService) {
      try {
        const isResponsive = await esp32DetectionService.testDeviceConnection(
          devicePath
        );
        return { success: true, responsive: isResponsive };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: errorMessage };
      }
    }
    return { success: false, error: "ESP32 detection service not available" };
  });

  ipcMain.handle("esp32-start-polling", () => {
    if (esp32DetectionService) {
      esp32DetectionService.startPolling();
      return { success: true };
    }
    return { success: false, error: "ESP32 detection service not available" };
  });

  ipcMain.handle("esp32-stop-polling", () => {
    if (esp32DetectionService) {
      esp32DetectionService.stopPolling();
      return { success: true };
    }
    return { success: false, error: "ESP32 detection service not available" };
  });
}

function setupGlobalShortcuts() {
  globalShortcut.register("CommandOrControl+Shift+R", () => {
    if (win) {
      if (win.isVisible()) {
        win.hide();
      } else {
        win.show();
        win.focus();
      }
    }
  });
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform === "darwin") {
    isQuiting = true;
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (win) {
    win.show();
    win.focus();
  }
});

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

  if (esp32DetectionService) {
    esp32DetectionService.destroy();
  }
});

app.whenReady().then(() => {
  // Remove the default application menu (File, Edit, View, etc.)
  Menu.setApplicationMenu(null);

  createWindow();
  initializeServices();
  setupGlobalShortcuts();
});
