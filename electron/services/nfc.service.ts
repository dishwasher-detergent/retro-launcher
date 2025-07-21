import { EventEmitter } from "events";
import { NFCCardData } from "../interfaces/nfc-card-data.interface";
import { ApplicationLauncherService } from "./application-launcher.service";
import { DeviceConnectionService } from "./device-connection.service";
import { NFCDataProcessor } from "./nfc-data-processor.service";
import { SerialPortService } from "./serial-port.service";

export class NFCService extends EventEmitter {
  private currentCardData: NFCCardData | null = null;
  private serialPortService: SerialPortService;
  private connectionService: DeviceConnectionService;
  private launcherService: ApplicationLauncherService;
  private dataProcessor: NFCDataProcessor;

  constructor() {
    super();

    this.serialPortService = new SerialPortService();
    this.connectionService = new DeviceConnectionService();
    this.launcherService = new ApplicationLauncherService();
    this.dataProcessor = new NFCDataProcessor();

    this.setupEventHandlers();
    this.initializeServices();
  }

  private setupEventHandlers(): void {
    this.connectionService.on("connected", () => {
      console.log("ESP32 connected successfully");
      this.emit("connected");
    });

    this.connectionService.on("disconnected", () => {
      console.log("ESP32 disconnected");
      this.emit("disconnected");
    });

    this.connectionService.on("reconnectRequested", () => {
      this.initializeConnection();
    });

    this.launcherService.on("applicationLaunched", (data) => {
      this.emit("applicationLaunched", data);
    });

    this.launcherService.on("launchError", (data) => {
      this.emit("launchError", data);
    });
  }

  private async initializeServices(): Promise<void> {
    console.log("Starting NFC service initialization...");

    if (!this.serialPortService.isSerialPortAvailable) {
      console.log("SerialPort not available, ESP32 connection disabled");
      this.emit("disconnected");
      return;
    }

    console.log("SerialPort loaded successfully, attempting ESP32 connection");
    await this.initializeConnection();
    console.log("NFC service initialization complete");
  }

  private async initializeConnection(): Promise<void> {
    if (!this.serialPortService.isSerialPortAvailable) {
      console.log("SerialPort not available, skipping ESP32 connection");
      this.emit("disconnected");
      return;
    }

    try {
      const compatiblePorts =
        await this.serialPortService.findCompatiblePorts();

      if (compatiblePorts.length > 0) {
        await this.connectToDevice(compatiblePorts[0]);
      } else {
        console.log("ESP32 not found, no compatible device detected");
        this.emit("disconnected");
      }
    } catch (error) {
      console.error("Failed to initialize ESP32 connection:", error);
      this.emit("disconnected");
    }
  }

  private async connectToDevice(portPath: string): Promise<void> {
    try {
      const device = this.serialPortService.createConnection(portPath);
      await this.connectionService.connect(device);

      this.connectionService.setupDataHandler((data: string) => {
        this.handleIncomingData(data);
      });
    } catch (error) {
      console.error("Failed to connect to device:", error);
      this.emit("disconnected");
    }
  }

  private handleIncomingData(data: string): void {
    const cardData = this.dataProcessor.processIncomingData(data);

    if (cardData) {
      this.currentCardData = cardData;
      this.emit("cardDetected", cardData);

      if (cardData.pathName) {
        this.launcherService.launchApplication(cardData.pathName);
      }
    }
  }

  public getCurrentCardData(): NFCCardData | null {
    return this.currentCardData;
  }

  public isESP32Connected(): boolean {
    return this.connectionService.connected;
  }

  public sendCommand(command: string): void {
    if (!this.serialPortService.isSerialPortAvailable) {
      console.warn("Cannot send command: SerialPort not available");
      return;
    }

    this.connectionService.sendCommand(command);
  }

  public async reconnect(): Promise<void> {
    if (!this.serialPortService.isSerialPortAvailable) {
      console.log("Attempting to reinitialize SerialPort...");
      await this.serialPortService.reinitialize();
    }

    this.cleanup();
    await this.initializeConnection();
  }

  public cleanup(): void {
    this.connectionService.disconnect();
    this.currentCardData = null;
  }
}
