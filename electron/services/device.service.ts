import { EventEmitter } from "events";
import { SerialPort } from "serialport";

export interface DeviceInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
}

export class DeviceService extends EventEmitter {
  private detectedDevices: Map<string, DeviceInfo> = new Map();
  private selectedDevice: DeviceInfo | null = null;
  private activeConnection: SerialPort | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL_MS = 2000;
  private readonly VALIDATION_TIMEOUT_MS = 3000;
  private readonly CUSTOM_DEVICE_ID = "RETRO_LAUNCHER";
  private readonly BAUD_RATE = 115200;

  private lastCartridgeData: string | null = null;
  private dataBuffer: string = "";

  private readonly KNOWN_DEVICES = {
    vendorProducts: [
      { vendorId: "10c4", productId: "ea60" },
      { vendorId: "1a86", productId: "7523" },
      { vendorId: "0403", productId: "6001" },
      { vendorId: "0403", productId: "6010" },
      { vendorId: "067b", productId: "2303" },
    ],
    manufacturers: [
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
    ],
  };

  constructor() {
    super();
    this.startPolling();
  }

  // ===========================================
  // DEVICE DETECTION METHODS
  // ===========================================

  public startPolling(): void {
    if (this.pollingInterval) return;

    this.scanForDevices();
    this.pollingInterval = setInterval(
      () => this.scanForDevices(),
      this.POLLING_INTERVAL_MS
    );
  }

  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  public setSelectedDevice(device: DeviceInfo | null): void {
    this.selectedDevice = device;

    if (device) {
      this.connectToSelectedDevice(device);
    } else {
      this.disconnectFromCurrentDevice();
    }

    this.emit("selectedDeviceChanged", device);
  }

  private async scanForDevices(): Promise<void> {
    try {
      const ports = await SerialPort.list();
      const currentDevicePaths = new Set<string>();

      for (const port of ports) {
        if (this.isPotentialTargetDevice(port)) {
          currentDevicePaths.add(port.path);

          if (!this.detectedDevices.has(port.path)) {
            const isValid = await this.validateDevice(port.path);

            if (isValid) {
              const deviceInfo: DeviceInfo = {
                path: port.path,
                manufacturer: port.manufacturer,
                serialNumber: port.serialNumber,
                vendorId: port.vendorId,
                productId: port.productId,
              };

              this.detectedDevices.set(port.path, deviceInfo);
              this.emit("deviceConnected", deviceInfo);

              if (!this.selectedDevice) {
                this.setSelectedDevice(deviceInfo);
              }

              console.log("Device connected:", deviceInfo);
            } else {
              currentDevicePaths.delete(port.path);
            }
          }
        }
      }

      // Handle disconnected devices
      this.handleDisconnectedDevices(currentDevicePaths);
    } catch (error) {
      console.error("Error scanning for devices:", error);
      this.emit("scanError", error);
    }
  }

  private handleDisconnectedDevices(currentPaths: Set<string>): void {
    const disconnectedPaths: string[] = [];

    for (const [path, deviceInfo] of this.detectedDevices.entries()) {
      if (!currentPaths.has(path)) {
        disconnectedPaths.push(path);
        this.emit("deviceDisconnected", deviceInfo);

        if (this.selectedDevice && this.selectedDevice.path === path) {
          this.setSelectedDevice(null);
        }
      }
    }

    disconnectedPaths.forEach((path) => this.detectedDevices.delete(path));

    if (!this.selectedDevice && this.detectedDevices.size > 0) {
      const firstDevice = Array.from(this.detectedDevices.values())[0];
      this.setSelectedDevice(firstDevice);
    }
  }

  private isPotentialTargetDevice(port: any): boolean {
    const vendorId = port.vendorId?.toLowerCase();
    const productId = port.productId?.toLowerCase();
    const manufacturer = port.manufacturer?.toLowerCase() || "";

    if (vendorId && productId) {
      const isKnown = this.KNOWN_DEVICES.vendorProducts.some(
        (device) =>
          device.vendorId === vendorId && device.productId === productId
      );
      if (isKnown) return true;
    }

    return this.KNOWN_DEVICES.manufacturers.some((name) =>
      manufacturer.includes(name)
    );
  }

  private async validateDevice(devicePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const port = new SerialPort({
        path: devicePath,
        baudRate: 115200,
        autoOpen: false,
      });

      const cleanup = () => {
        if (port.isOpen) {
          port.close(() => {
            resolve(false);
          });
        } else {
          resolve(false);
        }
      };

      const timeout = setTimeout(cleanup, this.VALIDATION_TIMEOUT_MS);

      port.open((err) => {
        if (err) {
          clearTimeout(timeout);
          cleanup();
          return;
        }

        port.write("WHO_ARE_YOU\n");

        const onData = (data: Buffer) => {
          const response = data.toString().trim();

          if (response.includes(this.CUSTOM_DEVICE_ID)) {
            clearTimeout(timeout);
            port.removeListener("data", onData);

            port.close(() => {
              resolve(true);
            });
          }
        };

        port.on("data", onData);

        port.on("error", (error) => {
          console.error(`Validation error on ${devicePath}:`, error);
          clearTimeout(timeout);
          cleanup();
        });
      });
    });
  }

  public async testDeviceConnection(devicePath: string): Promise<boolean> {
    return this.validateDevice(devicePath);
  }

  /**
   * Connect to the selected device and maintain the connection
   */
  private async connectToSelectedDevice(device: DeviceInfo): Promise<void> {
    this.disconnectFromCurrentDevice();

    try {
      const port = new SerialPort({
        path: device.path,
        baudRate: this.BAUD_RATE,
        autoOpen: false,
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, this.VALIDATION_TIMEOUT_MS);

        port.open((err) => {
          clearTimeout(timeout);
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      this.activeConnection = port;

      this.setupDeviceDataHandler(port);

      port.on("error", (error) => {
        console.error(`Device connection error on ${device.path}:`, error);
        this.emit("connectionError", { device, error });
      });

      port.on("close", () => {
        this.activeConnection = null;
        this.dataBuffer = "";
        this.emit("connectionClosed", device);
      });

      this.emit("deviceConnectionEstablished", { device, connection: port });
    } catch (error) {
      console.error(
        `Failed to connect to selected device ${device.path}:`,
        error
      );
      this.emit("connectionError", { device, error });
    }
  }

  /**
   * Disconnect from the current active connection
   */
  private disconnectFromCurrentDevice(): void {
    if (this.activeConnection && this.activeConnection.isOpen) {
      this.activeConnection.close();
      this.activeConnection = null;
      this.dataBuffer = "";
    }
  }

  /**
   * Get the active connection to the selected device
   */
  public getActiveConnection(): SerialPort | null {
    return this.activeConnection;
  }

  /**
   * Check if there's an active connection
   */
  public hasActiveConnection(): boolean {
    return this.activeConnection !== null && this.activeConnection.isOpen;
  }

  // ===========================================
  // NFC/CARTRIDGE METHODS
  // ===========================================

  /**
   * Setup listeners for serial port data
   */
  private setupDeviceDataHandler(port: SerialPort): void {
    port.removeAllListeners("data");

    port.on("data", (data: Buffer) => {
      const dataStr = data.toString();
      this.dataBuffer += dataStr;

      if (this.dataBuffer.includes("NFC_DETECTED")) {
        const nfcData = dataStr.split("DATA:")[1];

        if (nfcData) {
          this.lastCartridgeData = nfcData;
          this.emit("cartridgeDetected", nfcData);
        }
      }
    });
  }

  // ===========================================
  // SHARED COMMUNICATION METHODS
  // ===========================================

  /**
   * Send a command to the connected device
   */
  public async sendCommand(command: string): Promise<void> {
    if (!this.activeConnection || !this.activeConnection.isOpen) {
      throw new Error("No active device connection");
    }

    return new Promise((resolve, reject) => {
      this.activeConnection!.write(command + "\n", (error: any) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get the last detected cartridge data
   */
  public getLastCartridge(): string | null {
    return this.lastCartridgeData;
  }

  /**
   * Get the currently connected device path
   */
  public getConnectedDevice(): string | null {
    if (this.activeConnection && this.activeConnection.isOpen) {
      return this.activeConnection.path;
    }
    return null;
  }

  /**
   * Check if a device is connected
   */
  public hasConnectedDevice(): boolean {
    return this.hasActiveConnection();
  }

  public hasSelectedDevice(): boolean {
    return this.selectedDevice !== null;
  }

  public getDetectedDevices(): DeviceInfo[] {
    return Array.from(this.detectedDevices.values());
  }

  public hasConnectedDevices(): boolean {
    return this.detectedDevices.size > 0;
  }

  public getSelectedDevice(): DeviceInfo | null {
    return this.selectedDevice;
  }

  /**
   * Clean up all connections and resources
   */
  public destroy(): void {
    this.stopPolling();
    this.disconnectFromCurrentDevice();
    this.detectedDevices.clear();
    this.selectedDevice = null;
    this.dataBuffer = "";
    this.removeAllListeners();
  }
}
