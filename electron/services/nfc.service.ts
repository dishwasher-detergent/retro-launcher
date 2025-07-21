import { exec } from "child_process";
import { EventEmitter } from "events";
import {
  ESP32_CONNECTION_TIMEOUT,
  ESP32_PORT_PATTERNS,
  ESP32_RECONNECT_INTERVAL,
  SERIAL_PORT_CONFIG,
} from "../constants/nfc.constant";
import { NFCCardData } from "../interfaces/nfc-card-data.interface";

// Dynamically import SerialPort to handle ES module issues
let SerialPort: any = null;

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

export class NFCService extends EventEmitter {
  private currentCardData: NFCCardData | null = null;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private cardDetectionTimer: NodeJS.Timeout | null = null;
  private esp32Port: any = null;
  private isSerialPortAvailable = false;

  constructor() {
    super();
    // Initialize SerialPort and then start services
    this.initializeServices();
  }

  /**
   * Initialize all services
   */
  private async initializeServices(): Promise<void> {
    // Try to load SerialPort
    this.isSerialPortAvailable = await loadSerialPort();

    if (this.isSerialPortAvailable) {
      console.log(
        "SerialPort loaded successfully, attempting ESP32 connection"
      );
      this.initializeConnection();
    } else {
      console.log("SerialPort not available, ESP32 connection disabled");
    }
  }

  /**
   * Initialize ESP32 connection
   */
  private async initializeConnection(): Promise<void> {
    if (!this.isSerialPortAvailable || !SerialPort) {
      console.log("SerialPort not available, skipping ESP32 connection");
      return;
    }

    try {
      const portPath = await this.findESP32Port();
      if (portPath) {
        await this.connectToESP32(portPath);
      } else {
        console.log(
          "ESP32 not found, retrying in",
          ESP32_RECONNECT_INTERVAL,
          "ms"
        );
        this.scheduleReconnect();
      }
    } catch (error) {
      console.error("Failed to initialize ESP32 connection:", error);
      this.scheduleReconnect();
    }
  }

  /**
   * Find available ESP32 port
   */
  private async findESP32Port(): Promise<string | null> {
    if (!SerialPort) return null;

    try {
      const ports = await SerialPort.list();

      // Look for ESP32 by manufacturer or description
      for (const port of ports) {
        const manufacturer = port.manufacturer?.toLowerCase() || "";
        const description = port.pnpId?.toLowerCase() || "";

        if (
          manufacturer.includes("espressif") ||
          manufacturer.includes("silicon labs") ||
          description.includes("cp210") ||
          description.includes("ch340") ||
          ESP32_PORT_PATTERNS.some((pattern) => pattern.test(port.path))
        ) {
          console.log(`Found potential ESP32 port: ${port.path}`);
          return port.path;
        }
      }

      // Fallback: try the first available COM port on Windows
      if (process.platform === "win32" && ports.length > 0) {
        const comPort = ports.find((port: any) => port.path.startsWith("COM"));
        if (comPort) {
          console.log(`Trying fallback COM port: ${comPort.path}`);
          return comPort.path;
        }
      }

      return null;
    } catch (error) {
      console.error("Error listing serial ports:", error);
      return null;
    }
  }

  /**
   * Connect to ESP32 via serial port
   */
  private async connectToESP32(portPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.esp32Port = new SerialPort({
        path: portPath,
        ...SERIAL_PORT_CONFIG,
      });

      const timeout = setTimeout(() => {
        this.esp32Port?.close();
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

      this.esp32Port.on("error", (error: any) => {
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
  private setupDataHandlers(): void {
    if (!this.esp32Port) return;

    let buffer = "";

    this.esp32Port.on("data", (data: Buffer) => {
      buffer += data.toString();

      // Look for complete JSON messages (assuming they end with newline)
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        this.processIncomingData(line.trim());
      }
    });
  }

  /**
   * Process incoming data from ESP32
   */
  private processIncomingData(data: string): void {
    if (!data) return;

    try {
      const parsedData = JSON.parse(data) as NFCCardData;

      // Validate the data structure
      if (this.isValidNFCCardData(parsedData)) {
        this.currentCardData = parsedData;
        console.log("NFC card detected:", parsedData);

        // Emit card detected event
        this.emit("cardDetected", parsedData);

        // Launch application if pathName is provided
        if (parsedData.pathName) {
          this.launchApplication(parsedData.pathName);
        }
      } else {
        console.warn("Invalid NFC card data received:", data);
      }
    } catch (error) {
      // Not JSON data, might be debug output from ESP32
      console.log("ESP32 debug:", data);
    }
  }

  /**
   * Validate NFC card data structure
   */
  private isValidNFCCardData(data: any): data is NFCCardData {
    return (
      typeof data === "object" &&
      data !== null &&
      typeof data.name === "string" &&
      typeof data.icon === "string" &&
      typeof data.pathName === "string"
    );
  }

  /**
   * Launch application based on pathName
   */
  private launchApplication(pathName: string): void {
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
  private scheduleReconnect(): void {
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
  public getCurrentCardData(): NFCCardData | null {
    return this.currentCardData;
  }

  /**
   * Get connection status
   */
  public isESP32Connected(): boolean {
    return this.isConnected && this.isSerialPortAvailable;
  }

  /**
   * Send command to ESP32
   */
  public sendCommand(command: string): void {
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
  public cleanup(): void {
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
  private async initializeSerialPort(): Promise<void> {
    try {
      // Try to reload SerialPort
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
  public reconnect(): void {
    if (!this.isSerialPortAvailable) {
      console.log("Attempting to reinitialize SerialPort...");
      this.initializeSerialPort();
      return;
    }

    this.cleanup();
    this.initializeConnection();
  }
}
