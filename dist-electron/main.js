var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { nativeImage, Tray, Menu, app, BrowserWindow, globalShortcut, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "child_process";
import { EventEmitter } from "events";
const ESP32_BAUD_RATE = 115200;
const ESP32_CONNECTION_TIMEOUT = 5e3;
const ESP32_RECONNECT_INTERVAL = 3e3;
const SERIAL_PORT_CONFIG = {
  baudRate: ESP32_BAUD_RATE,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  autoOpen: false
};
let SerialPort = null;
async function loadSerialPort() {
  try {
    const serialportModule = await import("serialport");
    SerialPort = serialportModule.SerialPort;
    return true;
  } catch (error) {
    console.error("Failed to load SerialPort:", error);
    return false;
  }
}
class NFCService extends EventEmitter {
  constructor() {
    super();
    __publicField(this, "currentCardData", null);
    __publicField(this, "isConnected", false);
    // Start as disconnected
    __publicField(this, "reconnectTimer", null);
    __publicField(this, "cardDetectionTimer", null);
    __publicField(this, "esp32Port", null);
    __publicField(this, "isSerialPortAvailable", false);
    this.isConnected = false;
    this.isSerialPortAvailable = false;
    this.initializeServices();
  }
  /**
   * Initialize all services
   */
  async initializeServices() {
    console.log("Starting NFC service initialization...");
    this.isSerialPortAvailable = await loadSerialPort();
    console.log("SerialPort availability:", this.isSerialPortAvailable);
    if (this.isSerialPortAvailable) {
      console.log(
        "SerialPort loaded successfully, attempting ESP32 connection"
      );
      this.isConnected = false;
      this.emit("disconnected");
      await this.initializeConnection();
    } else {
      console.log("SerialPort not available, ESP32 connection disabled");
      this.isConnected = false;
      this.emit("disconnected");
    }
    console.log(
      "NFC service initialization complete. Final status:",
      this.isESP32Connected()
    );
  }
  /**
   * Initialize ESP32 connection
   */
  async initializeConnection() {
    if (!this.isSerialPortAvailable || !SerialPort) {
      console.log("SerialPort not available, skipping ESP32 connection");
      this.isConnected = false;
      this.emit("disconnected");
      return;
    }
    try {
      const portPath = await this.findESP32Port();
      if (portPath) {
        await this.connectToESP32(portPath);
      } else {
        console.log("ESP32 not found, no compatible device detected");
        this.isConnected = false;
        this.emit("disconnected");
        console.log("Will retry connection in", ESP32_RECONNECT_INTERVAL, "ms");
        this.scheduleReconnect();
      }
    } catch (error) {
      console.error("Failed to initialize ESP32 connection:", error);
      this.isConnected = false;
      this.emit("disconnected");
      this.scheduleReconnect();
    }
  }
  /**
   * Find available ESP32 port
   */
  async findESP32Port() {
    var _a, _b, _c, _d;
    if (!SerialPort) return null;
    try {
      const ports = await SerialPort.list();
      console.log(
        `Found ${ports.length} serial ports:`,
        ports.map(
          (p) => `${p.path} (${p.manufacturer || "Unknown"}) - ${p.pnpId || "No PnP ID"}`
        )
      );
      for (const port of ports) {
        const manufacturer = ((_a = port.manufacturer) == null ? void 0 : _a.toLowerCase()) || "";
        const description = ((_b = port.pnpId) == null ? void 0 : _b.toLowerCase()) || "";
        const productId = ((_c = port.productId) == null ? void 0 : _c.toLowerCase()) || "";
        const vendorId = ((_d = port.vendorId) == null ? void 0 : _d.toLowerCase()) || "";
        console.log(
          `Checking port ${port.path}: manufacturer="${manufacturer}", pnpId="${description}", productId="${productId}", vendorId="${vendorId}"`
        );
        if (description.includes("retro-launcher")) {
          console.log(
            `Found potential ESP32 port: ${port.path} - ${manufacturer}`
          );
          const isValidESP32 = await this.validateESP32Port(port.path);
          if (isValidESP32) {
            return port.path;
          }
        }
      }
      console.log("No ESP32-compatible ports found");
      return null;
    } catch (error) {
      console.error("Error listing serial ports:", error);
      return null;
    }
  }
  /**
   * Validate if a port is actually an ESP32 with NFC capability
   */
  async validateESP32Port(portPath) {
    try {
      console.log(`Validating ESP32 port: ${portPath}`);
      const testPort = new SerialPort({
        path: portPath,
        ...SERIAL_PORT_CONFIG
      });
      return new Promise((resolve) => {
        let responseReceived = false;
        const timeout = setTimeout(() => {
          if (!responseReceived) {
            console.log(
              `Port ${portPath} validation timeout - not a valid ESP32 NFC device`
            );
            testPort.close();
            resolve(false);
          }
        }, 2e3);
        testPort.on("open", () => {
          console.log(`Sending validation command to ${portPath}`);
          testPort.write("IDENTIFY\n");
        });
        testPort.on("data", (data) => {
          const response = data.toString().trim();
          console.log(`Received from ${portPath}:`, response);
          if (response.includes("RETRO-LAUNCHER-NFC-DEVICE") || response.includes("Retro Launcher") || response.includes("NFC Reader") || response.includes("ESP32 NFC") || response.includes("MFRC522") || response.includes("Ready to read NFC cards")) {
            responseReceived = true;
            clearTimeout(timeout);
            testPort.close();
            console.log(`Port ${portPath} validated as ESP32 NFC device`);
            resolve(true);
          }
        });
        testPort.on("error", (error) => {
          console.log(`Port ${portPath} validation error:`, error.message);
          clearTimeout(timeout);
          testPort.close();
          resolve(false);
        });
        testPort.open();
      });
    } catch (error) {
      console.log(`Port ${portPath} validation failed:`, error);
      return false;
    }
  }
  /**
   * Connect to ESP32 via serial port
   */
  async connectToESP32(portPath) {
    return new Promise((resolve, reject) => {
      this.esp32Port = new SerialPort({
        path: portPath,
        ...SERIAL_PORT_CONFIG
      });
      const timeout = setTimeout(() => {
        var _a;
        (_a = this.esp32Port) == null ? void 0 : _a.close();
        reject(new Error("Connection timeout"));
      }, ESP32_CONNECTION_TIMEOUT);
      this.esp32Port.on("open", () => {
        clearTimeout(timeout);
        this.isConnected = true;
        console.log(`Connected to ESP32 on port: ${portPath}`);
        this.setupDataHandlers();
        this.emit("connected");
        resolve();
      });
      this.esp32Port.on("error", (error) => {
        clearTimeout(timeout);
        console.error("ESP32 connection error:", error);
        this.isConnected = false;
        this.emit("disconnected");
        reject(error);
      });
      this.esp32Port.on("close", () => {
        this.isConnected = false;
        console.log("ESP32 connection closed");
        this.emit("disconnected");
        this.scheduleReconnect();
      });
      this.esp32Port.open();
    });
  }
  /**
   * Setup data handlers for incoming ESP32 data
   */
  setupDataHandlers() {
    if (!this.esp32Port) return;
    let buffer = "";
    this.esp32Port.on("data", (data) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        this.processIncomingData(line.trim());
      }
    });
  }
  /**
   * Process incoming data from ESP32
   */
  processIncomingData(data) {
    if (!data) return;
    try {
      const parsedData = JSON.parse(data);
      if (this.isValidNFCCardData(parsedData)) {
        this.currentCardData = parsedData;
        console.log("NFC card detected:", parsedData);
        this.emit("cardDetected", parsedData);
        if (parsedData.pathName) {
          this.launchApplication(parsedData.pathName);
        }
      } else {
        console.warn("Invalid NFC card data received:", data);
      }
    } catch (error) {
      console.log("ESP32 debug:", data);
    }
  }
  /**
   * Validate NFC card data structure
   */
  isValidNFCCardData(data) {
    return typeof data === "object" && data !== null && typeof data.name === "string" && typeof data.icon === "string" && typeof data.pathName === "string";
  }
  /**
   * Launch application based on pathName
   */
  launchApplication(pathName) {
    console.log(`Launching application: ${pathName}`);
    exec(pathName, (error) => {
      if (error) {
        console.error(`Failed to launch application: ${error.message}`);
        this.emit("launchError", { pathName, error: error.message });
      } else {
        console.log(`Successfully launched: ${pathName}`);
        this.emit("applicationLaunched", { pathName });
      }
    });
  }
  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = setTimeout(() => {
      if (!this.isConnected) {
        this.initializeConnection();
      }
    }, ESP32_RECONNECT_INTERVAL);
  }
  /**
   * Get current card data
   */
  getCurrentCardData() {
    return this.currentCardData;
  }
  /**
   * Get connection status
   */
  isESP32Connected() {
    var _a;
    const connected = this.isConnected && this.esp32Port && this.esp32Port.isOpen;
    console.log(
      `ESP32 Connection Status: isConnected=${this.isConnected}, hasPort=${!!this.esp32Port}, isPortOpen=${(_a = this.esp32Port) == null ? void 0 : _a.isOpen}, result=${connected}`
    );
    return connected;
  }
  /**
   * Send command to ESP32
   */
  sendCommand(command) {
    if (!this.isSerialPortAvailable) {
      console.warn("Cannot send command: SerialPort not available");
      return;
    }
    if (this.esp32Port && this.isConnected) {
      this.esp32Port.write(command + "\n");
    } else {
      console.warn("Cannot send command: ESP32 not connected");
    }
  }
  /**
   * Cleanup and close connections
   */
  cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.cardDetectionTimer) {
      clearTimeout(this.cardDetectionTimer);
      this.cardDetectionTimer = null;
    }
    if (this.esp32Port && this.esp32Port.isOpen) {
      this.esp32Port.close();
    }
    this.esp32Port = null;
    this.isConnected = false;
    this.currentCardData = null;
  }
  /**
   * Initialize SerialPort availability check
   */
  async initializeSerialPort() {
    try {
      this.isSerialPortAvailable = await loadSerialPort();
      if (this.isSerialPortAvailable) {
        console.log("SerialPort reloaded successfully");
        this.initializeConnection();
      } else {
        console.log("SerialPort still not available");
      }
    } catch (error) {
      this.isSerialPortAvailable = false;
      console.error("SerialPort initialization failed:", error);
    }
  }
  /**
   * Manually trigger reconnection
   */
  reconnect() {
    if (!this.isSerialPortAvailable) {
      console.log("Attempting to reinitialize SerialPort...");
      this.initializeSerialPort();
      return;
    }
    this.cleanup();
    this.initializeConnection();
  }
}
const TRAY_TOOLTIP = "Retro Launcher - NFC Card Reader";
const TRAY_ICON_PATH = "electron-vite.svg";
const TRAY_MENU_LABELS = {
  SHOW: "Show Retro Launcher",
  QUIT: "Quit",
  NFC_STATUS: "NFC Status",
  CURRENT_CARD: "Current Card",
  RECONNECT: "Reconnect ESP32"
};
class TrayService {
  constructor(nfcService2, menuOptions) {
    __publicField(this, "tray", null);
    __publicField(this, "nfcService");
    __publicField(this, "menuOptions");
    __publicField(this, "currentCardData", null);
    __publicField(this, "isNFCConnected", false);
    this.nfcService = nfcService2;
    this.menuOptions = menuOptions;
    this.setupNFCEventListeners();
  }
  /**
   * Initialize system tray
   */
  initializeTray(iconBasePath) {
    const iconPath = path.join(iconBasePath, TRAY_ICON_PATH);
    let trayIcon;
    try {
      trayIcon = nativeImage.createFromPath(iconPath);
      if (trayIcon.isEmpty()) {
        trayIcon = nativeImage.createEmpty();
      }
    } catch (error) {
      console.error("Failed to load tray icon:", error);
      trayIcon = nativeImage.createEmpty();
    }
    this.tray = new Tray(trayIcon);
    this.tray.setToolTip(TRAY_TOOLTIP);
    this.tray.on("double-click", () => {
      this.menuOptions.showWindow();
    });
    this.updateTrayMenu();
  }
  /**
   * Setup NFC service event listeners
   */
  setupNFCEventListeners() {
    this.nfcService.on("connected", () => {
      this.isNFCConnected = true;
      this.updateTrayMenu();
    });
    this.nfcService.on("disconnected", () => {
      this.isNFCConnected = false;
      this.currentCardData = null;
      this.updateTrayMenu();
    });
    this.nfcService.on("cardDetected", (cardData) => {
      this.currentCardData = cardData;
      this.updateTrayMenu();
    });
  }
  /**
   * Update tray context menu
   */
  updateTrayMenu() {
    if (!this.tray) return;
    const contextMenu = Menu.buildFromTemplate([
      {
        label: TRAY_MENU_LABELS.SHOW,
        click: () => this.menuOptions.showWindow()
      },
      { type: "separator" },
      {
        label: `${TRAY_MENU_LABELS.NFC_STATUS}: ${this.isNFCConnected ? "Connected" : "Disconnected"}`,
        enabled: false
      },
      {
        label: TRAY_MENU_LABELS.RECONNECT,
        click: () => this.nfcService.reconnect(),
        enabled: !this.isNFCConnected
      },
      { type: "separator" },
      {
        label: this.getCurrentCardLabel(),
        enabled: false
      },
      { type: "separator" },
      {
        label: TRAY_MENU_LABELS.QUIT,
        click: () => this.menuOptions.quitApp()
      }
    ]);
    this.tray.setContextMenu(contextMenu);
  }
  /**
   * Get current card label for menu
   */
  getCurrentCardLabel() {
    if (!this.currentCardData) {
      return `${TRAY_MENU_LABELS.CURRENT_CARD}: None`;
    }
    return `${TRAY_MENU_LABELS.CURRENT_CARD}: ${this.currentCardData.name}`;
  }
  /**
   * Update tray tooltip with current card info
   */
  updateTooltip(cardData) {
    if (!this.tray) return;
    let tooltip = TRAY_TOOLTIP;
    if (cardData) {
      tooltip += `
Current Card: ${cardData.name}`;
    }
    if (!this.isNFCConnected) {
      tooltip += "\nNFC: Disconnected";
    }
    this.tray.setToolTip(tooltip);
  }
  /**
   * Show notification balloon
   */
  showNotification(title, content) {
    if (!this.tray) return;
    this.tray.displayBalloon({
      title,
      content,
      iconType: "info"
    });
  }
  /**
   * Cleanup tray
   */
  cleanup() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
  /**
   * Get tray instance
   */
  getTray() {
    return this.tray;
  }
}
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let win;
let nfcService;
let trayService;
let isQuiting = false;
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 600,
    height: 550,
    minWidth: 600,
    minHeight: 550,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
    const currentCard = nfcService.getCurrentCardData();
    if (currentCard) {
      win == null ? void 0 : win.webContents.send("nfc-card-data", currentCard);
    }
  });
  win.on("close", (event) => {
    if (!isQuiting) {
      event.preventDefault();
      win == null ? void 0 : win.hide();
      if (trayService) {
        trayService.showNotification(
          "Retro Launcher",
          "App was minimized to tray. Click the tray icon to restore."
        );
      }
      return false;
    }
  });
  win.on("minimize", (event) => {
    event.preventDefault();
    win == null ? void 0 : win.hide();
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
  nfcService.on("cardDetected", (cardData) => {
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
    }
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
  ipcMain.handle("send-nfc-command", (_, command) => {
    nfcService.sendCommand(command);
    return { success: true };
  });
  ipcMain.handle("hide-to-tray", () => {
    if (win) {
      win.hide();
    }
    return { success: true };
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
app.on("window-all-closed", () => {
  if (process.platform === "darwin") {
    isQuiting = true;
    app.quit();
  }
});
app.on("activate", () => {
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
  globalShortcut.unregisterAll();
  if (nfcService) {
    nfcService.cleanup();
  }
  if (trayService) {
    trayService.cleanup();
  }
});
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  initializeServices();
  setupGlobalShortcuts();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
