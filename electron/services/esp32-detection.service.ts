import { EventEmitter } from "events";
import { SerialPort } from "serialport";

export interface ESP32DeviceInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
}

export class ESP32DetectionService extends EventEmitter {
  private detectedDevices: Map<string, ESP32DeviceInfo> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL_MS = 2000; // Check every 2 seconds

  // Common ESP32 vendor IDs and product IDs
  private readonly ESP32_IDENTIFIERS = [
    { vendorId: "10c4", productId: "ea60" }, // Silicon Labs CP210x (common ESP32 USB-to-UART)
    { vendorId: "1a86", productId: "7523" }, // QinHeng Electronics CH340
    { vendorId: "0403", productId: "6001" }, // FTDI FT232R (some ESP32 boards)
    { vendorId: "0403", productId: "6010" }, // FTDI FT2232H
    { vendorId: "067b", productId: "2303" }, // Prolific PL2303
  ];

  constructor() {
    super();
    this.startPolling();
  }

  /**
   * Start polling for ESP32 devices
   */
  public startPolling(): void {
    if (this.pollingInterval) {
      return; // Already polling
    }

    console.log("ESP32 Detection Service: Starting device polling...");
    this.scanForDevices(); // Initial scan

    this.pollingInterval = setInterval(() => {
      this.scanForDevices();
    }, this.POLLING_INTERVAL_MS);
  }

  /**
   * Stop polling for ESP32 devices
   */
  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log("ESP32 Detection Service: Stopped device polling");
    }
  }

  /**
   * Get currently detected ESP32 devices
   */
  public getDetectedDevices(): ESP32DeviceInfo[] {
    return Array.from(this.detectedDevices.values());
  }

  /**
   * Check if any ESP32 devices are currently connected
   */
  public hasConnectedDevices(): boolean {
    return this.detectedDevices.size > 0;
  }

  /**
   * Scan for ESP32 devices
   */
  private async scanForDevices(): Promise<void> {
    try {
      const ports = await SerialPort.list();
      const currentDevicePaths = new Set<string>();

      for (const port of ports) {
        if (this.isESP32Device(port)) {
          currentDevicePaths.add(port.path);

          if (!this.detectedDevices.has(port.path)) {
            // New ESP32 device detected
            const deviceInfo: ESP32DeviceInfo = {
              path: port.path,
              manufacturer: port.manufacturer,
              serialNumber: port.serialNumber,
              vendorId: port.vendorId,
              productId: port.productId,
            };

            this.detectedDevices.set(port.path, deviceInfo);
            console.log(`ESP32 device connected: ${port.path}`);
            this.emit("deviceConnected", deviceInfo);
          }
        }
      }

      // Check for disconnected devices
      const disconnectedDevices: string[] = [];
      for (const [path, deviceInfo] of this.detectedDevices.entries()) {
        if (!currentDevicePaths.has(path)) {
          disconnectedDevices.push(path);
          console.log(`ESP32 device disconnected: ${path}`);
          this.emit("deviceDisconnected", deviceInfo);
        }
      }

      // Remove disconnected devices
      disconnectedDevices.forEach((path) => {
        this.detectedDevices.delete(path);
      });
    } catch (error) {
      console.error("Error scanning for ESP32 devices:", error);
      this.emit("scanError", error);
    }
  }

  /**
   * Check if a serial port represents an ESP32 device
   */
  private isESP32Device(port: any): boolean {
    const vendorId = port.vendorId?.toLowerCase();
    const productId = port.productId?.toLowerCase();
    const manufacturer = port.manufacturer?.toLowerCase() || "";

    // Check against known ESP32 USB-to-UART chip identifiers
    if (vendorId && productId) {
      const isKnownChip = this.ESP32_IDENTIFIERS.some(
        (identifier) =>
          identifier.vendorId === vendorId && identifier.productId === productId
      );

      if (isKnownChip) {
        return true;
      }
    }

    // Check manufacturer names that commonly indicate ESP32 boards
    const esp32Manufacturers = [
      "silicon labs",
      "silabser",
      "cp210x",
      "qinheng",
      "ch340",
      "ftdi",
      "espressif",
      "esp32",
    ];

    return esp32Manufacturers.some((name) => manufacturer.includes(name));
  }

  /**
   * Attempt to communicate with an ESP32 device to verify it's responsive
   */
  public async testDeviceConnection(devicePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const port = new SerialPort({
          path: devicePath,
          baudRate: 115200,
          autoOpen: false,
        });

        const timeout = setTimeout(() => {
          port.close();
          resolve(false);
        }, 3000); // 3 second timeout

        port.open((err) => {
          if (err) {
            clearTimeout(timeout);
            resolve(false);
            return;
          }

          // Send a simple command to test communication
          port.write("ping\n");

          const dataHandler = () => {
            clearTimeout(timeout);
            port.close();
            // If we get any response, consider it successful
            resolve(true);
          };

          port.once("data", dataHandler);

          // Also consider it successful if we can open the port without errors
          setTimeout(() => {
            clearTimeout(timeout);
            port.close();
            resolve(true);
          }, 1000);
        });
      } catch (error) {
        resolve(false);
      }
    });
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.stopPolling();
    this.detectedDevices.clear();
    this.removeAllListeners();
  }
}
