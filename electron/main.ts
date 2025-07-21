import { app, BrowserWindow, globalShortcut, ipcMain, Menu } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NFCCardData } from "./interfaces/nfc-card-data.interface";
import { NFCService } from "./services/nfc.service";
import { TrayService } from "./services/tray.service";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Global variables
let win: BrowserWindow | null;
let nfcService: NFCService;
let trayService: TrayService;
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
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 600,
    height: 225,
    minWidth: 600,
    minHeight: 225,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
    // Send initial NFC data if available
    const currentCard = nfcService.getCurrentCardData();
    if (currentCard) {
      win?.webContents.send("nfc-card-data", currentCard);
    }
  });

  // Handle window close - hide to tray instead of closing
  win.on("close", (event) => {
    if (!isQuiting) {
      event.preventDefault();
      win?.hide();

      // Show notification that app is still running in tray
      if (trayService) {
        trayService.showNotification(
          "Retro Launcher",
          "App was minimized to tray. Click the tray icon to restore."
        );
      }
      return false;
    }
  });

  // Handle minimize to tray (optional - remove this if you want minimize to stay in taskbar)
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
}

function initializeServices() {
  // Initialize NFC service
  nfcService = new NFCService();

  // Setup NFC event handlers
  nfcService.on("cardDetected", (cardData: NFCCardData) => {
    // Send card data to renderer if window exists
    if (win && !win.isDestroyed()) {
      win.webContents.send("nfc-card-data", cardData);
    }

    // Show notification
    if (trayService) {
      trayService.showNotification(
        "NFC Card Detected",
        `${cardData.name} - Launching ${cardData.pathName}`
      );
      trayService.updateTooltip(cardData);
    }
  });

  nfcService.on("connected", () => {
    console.log("NFC Service connected");
    if (win && !win.isDestroyed()) {
      win.webContents.send("nfc-status", { connected: true });
    }
  });

  nfcService.on("disconnected", () => {
    console.log("NFC Service disconnected");
    if (win && !win.isDestroyed()) {
      win.webContents.send("nfc-status", { connected: false });
    }
  });

  nfcService.on("applicationLaunched", ({ pathName }) => {
    console.log(`Application launched: ${pathName}`);
    if (win && !win.isDestroyed()) {
      win.webContents.send("application-launched", { pathName });
    }
  });

  nfcService.on("launchError", ({ pathName, error }) => {
    console.error(`Failed to launch ${pathName}:`, error);
    if (win && !win.isDestroyed()) {
      win.webContents.send("launch-error", { pathName, error });
    }
  });

  // Initialize tray service
  trayService = new TrayService(nfcService, {
    showWindow: () => {
      if (win) {
        win.show();
        win.focus();
      }
    },
    quitApp: () => {
      isQuiting = true;
      app.quit();
    },
  });

  trayService.initializeTray(process.env.VITE_PUBLIC || "");

  // Setup IPC handlers
  setupIPCHandlers();
}

function setupIPCHandlers() {
  // Get current NFC card data
  ipcMain.handle("get-current-card", () => {
    return nfcService.getCurrentCardData();
  });

  // Get NFC connection status
  ipcMain.handle("get-nfc-status", () => {
    return { connected: nfcService.isESP32Connected() };
  });

  // Reconnect to ESP32
  ipcMain.handle("reconnect-nfc", () => {
    nfcService.reconnect();
    return { success: true };
  });

  // Send command to ESP32
  ipcMain.handle("send-nfc-command", (_, command: string) => {
    nfcService.sendCommand(command);
    return { success: true };
  });

  // Hide window to tray
  ipcMain.handle("hide-to-tray", () => {
    if (win) {
      win.hide();
    }
    return { success: true };
  });
}

function setupGlobalShortcuts() {
  // Register global shortcut to toggle window visibility
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
  // Don't quit the app when all windows are closed - keep running in tray
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
  if (nfcService) {
    nfcService.cleanup();
  }
  if (trayService) {
    trayService.cleanup();
  }
});

app.whenReady().then(() => {
  // Remove the default application menu (File, Edit, View, etc.)
  Menu.setApplicationMenu(null);

  createWindow();
  initializeServices();
  setupGlobalShortcuts();
});
