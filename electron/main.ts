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
    const currentCard = nfcService.getCurrentCardData();
    if (currentCard) {
      win?.webContents.send("nfc-card-data", currentCard);
    }
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
  nfcService = new NFCService();

  nfcService.on("cardDetected", (cardData: NFCCardData) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send("nfc-card-data", cardData);
    }

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

  setupIPCHandlers();
}

function setupIPCHandlers() {
  ipcMain.handle("get-current-card", () => {
    return nfcService.getCurrentCardData();
  });

  ipcMain.handle("get-nfc-status", () => {
    console.log("IPC: get-nfc-status called");
    console.log("nfcService exists:", !!nfcService);
    if (nfcService) {
      const status = nfcService.isESP32Connected();
      console.log("IPC: returning status:", status);
      return { connected: status };
    } else {
      console.log("IPC: nfcService not initialized, returning false");
      return { connected: false };
    }
  });

  ipcMain.handle("reconnect-nfc", () => {
    nfcService.reconnect();
    return { success: true };
  });

  ipcMain.handle("send-nfc-command", (_, command: string) => {
    nfcService.sendCommand(command);
    return { success: true };
  });

  ipcMain.handle("hide-to-tray", () => {
    if (win) {
      win.hide();
    }
    return { success: true };
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
