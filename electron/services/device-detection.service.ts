import { EventEmitter } from "events";
import { SerialPort } from "serialport";

export interface DeviceInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
}

export class DeviceDetectionService extends EventEmitter {
  private detectedDevices: Map<string, DeviceInfo> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL_MS = 2000; // Check every 2 seconds

  // Your custom device identifier - change this to match your device's response
  private readonly CUSTOM_DEVICE_ID = "RETRO_LAUNCHER";

  // Common microcontroller vendor IDs and product IDs
  private readonly DEVICE_IDENTIFIERS = [
    { vendorId: "10c4", productId: "ea60" }, // Silicon Labs CP210x (common USB-to-UART)
    { vendorId: "1a86", productId: "7523" }, // QinHeng Electronics CH340
    { vendorId: "0403", productId: "6001" }, // FTDI FT232R (some development boards)
    { vendorId: "0403", productId: "6010" }, // FTDI FT2232H
    { vendorId: "067b", productId: "2303" }, // Prolific PL2303
  ];

  constructor() {
    super();
    this.startPolling();
  }

  /**
   * Start polling for devices
   */
  public startPolling(): void {
    if (this.pollingInterval) {
      return; // Already polling
    }

    console.log("Device Detection Service: Starting device polling...");
    this.scanForDevices(); // Initial scan

    this.pollingInterval = setInterval(() => {
      this.scanForDevices();
    }, this.POLLING_INTERVAL_MS);
  }

  /**
   * Stop polling for devices
   */
  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log("Device Detection Service: Stopped device polling");
    }
  }

  /**
   * Get currently detected devices
   */
  public getDetectedDevices(): DeviceInfo[] {
    return Array.from(this.detectedDevices.values());
  }

  /**
   * Check if any devices are currently connected
   */
  public hasConnectedDevices(): boolean {
    return this.detectedDevices.size > 0;
  }

  /**
   * Scan for devices
   */
  private async scanForDevices(): Promise<void> {
    try {
      const ports = await SerialPort.list();
      const currentDevicePaths = new Set<string>();

      for (const port of ports) {
        if (this.isTargetDevice(port)) {
          // Validate the device with custom identifier
          const isValidDevice = await this.validateCustomDevice(port.path);

          if (isValidDevice) {
            currentDevicePaths.add(port.path);

            if (!this.detectedDevices.has(port.path)) {
              const deviceInfo: DeviceInfo = {
                path: port.path,
                manufacturer: port.manufacturer,
                serialNumber: port.serialNumber,
                vendorId: port.vendorId,
                productId: port.productId,
              };

              this.detectedDevices.set(port.path, deviceInfo);
              console.log(`Custom device connected: ${port.path}`);
              this.emit("deviceConnected", deviceInfo);
            }
          }
        }
      }

      // Check for disconnected devices
      const disconnectedDevices: string[] = [];
      for (const [path, deviceInfo] of this.detectedDevices.entries()) {
        if (!currentDevicePaths.has(path)) {
          disconnectedDevices.push(path);
          console.log(`Device disconnected: ${path}`);
          this.emit("deviceDisconnected", deviceInfo);
        }
      }

      // Remove disconnected devices
      disconnectedDevices.forEach((path) => {
        this.detectedDevices.delete(path);
      });
    } catch (error) {
      console.error("Error scanning for devices:", error);
      this.emit("scanError", error);
    }
  }

  /**
   * Check if a serial port represents a target device
   */
  private isTargetDevice(port: any): boolean {
    const vendorId = port.vendorId?.toLowerCase();
    const productId = port.productId?.toLowerCase();
    const manufacturer = port.manufacturer?.toLowerCase() || "";

    // Check against known microcontroller USB-to-UART chip identifiers
    if (vendorId && productId) {
      const isKnownChip = this.DEVICE_IDENTIFIERS.some(
        (identifier) =>
          identifier.vendorId === vendorId && identifier.productId === productId
      );

      if (isKnownChip) {
        return true;
      }
    }

    // Check manufacturer names that commonly indicate development boards
    const deviceManufacturers = [
      "silicon labs",
      "silabser",
      "cp210x",
      "qinheng",
      "ch340",
      "ftdi",
      "espressif",
      "arduino",
      "microchip",
      "atmel",
      "nordic",
    ];

    return deviceManufacturers.some((name) => manufacturer.includes(name));
  }

  /**
   * Validate if a device responds with the custom identifier
   */
  private async validateCustomDevice(devicePath: string): Promise<boolean> {
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
        }, 5000);

        port.open((err) => {
          if (err) {
            clearTimeout(timeout);
            resolve(false);
            return;
          }

          port.write("WHO_ARE_YOU\n");

          const dataHandler = (data: Buffer) => {
            const response = data.toString().trim();
            console.log(`Device ${devicePath} responded: ${response}`);

            if (response.includes(this.CUSTOM_DEVICE_ID)) {
              clearTimeout(timeout);
              port.close();
              resolve(true);
            }
          };

          port.on("data", dataHandler);

          setTimeout(() => {
            port.removeListener("data", dataHandler);
          }, 4500);
        });
      } catch (error) {
        console.error(`Error validating device ${devicePath}:`, error);
        resolve(false);
      }
    });
  }

  /**
   * Attempt to communicate with a device to verify it's responsive
   */
  public async testDeviceConnection(devicePath: string): Promise<boolean> {
    // Use the custom validation method for testing as well
    return this.validateCustomDevice(devicePath);
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
