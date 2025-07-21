import { EventEmitter } from "events";
import { SERIAL_PORT_CONFIG } from "../constants/nfc.constant";

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

export class SerialPortService extends EventEmitter {
  private isAvailable = false;

  constructor() {
    super();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    this.isAvailable = await loadSerialPort();
    console.log("SerialPort availability:", this.isAvailable);
  }

  public async findCompatiblePorts(): Promise<string[]> {
    if (!this.isAvailable || !SerialPort) return [];

    try {
      const ports = await SerialPort.list();
      console.log(
        `Found ${ports.length} serial ports:`,
        ports.map(
          (p: any) =>
            `${p.path} (${p.manufacturer || "Unknown"}) - ${
              p.pnpId || "No PnP ID"
            }`
        )
      );

      const compatiblePorts: string[] = [];

      for (const port of ports) {
        const description = port.pnpId?.toLowerCase() || "";

        if (description.includes("retro-launcher")) {
          console.log(`Found potential compatible port: ${port.path}`);

          if (await this.validatePort(port.path)) {
            compatiblePorts.push(port.path);
          }
        }
      }

      return compatiblePorts;
    } catch (error) {
      console.error("Error listing serial ports:", error);
      return [];
    }
  }

  private async validatePort(portPath: string): Promise<boolean> {
    if (!SerialPort) return false;

    try {
      console.log(`Validating port: ${portPath}`);

      const testPort = new SerialPort({
        path: portPath,
        ...SERIAL_PORT_CONFIG,
      });

      return new Promise((resolve) => {
        let responseReceived = false;
        const timeout = setTimeout(() => {
          if (!responseReceived) {
            console.log(`Port ${portPath} validation timeout`);
            testPort.close();
            resolve(false);
          }
        }, 2000);

        testPort.on("open", () => {
          console.log(`Sending validation command to ${portPath}`);
          testPort.write("IDENTIFY\n");
        });

        testPort.on("data", (data: Buffer) => {
          const response = data.toString().trim();
          console.log(`Received from ${portPath}:`, response);

          if (
            response.includes("RETRO-LAUNCHER-NFC-DEVICE") ||
            response.includes("Retro Launcher") ||
            response.includes("NFC Reader") ||
            response.includes("ESP32 NFC") ||
            response.includes("MFRC522") ||
            response.includes("Ready to read NFC cards")
          ) {
            responseReceived = true;
            clearTimeout(timeout);
            testPort.close();
            console.log(`Port ${portPath} validated as compatible device`);
            resolve(true);
          }
        });

        testPort.on("error", (error: any) => {
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

  public createConnection(portPath: string): any {
    if (!this.isAvailable || !SerialPort) {
      throw new Error("SerialPort not available");
    }

    return new SerialPort({
      path: portPath,
      ...SERIAL_PORT_CONFIG,
    });
  }

  public get isSerialPortAvailable(): boolean {
    return this.isAvailable;
  }

  public async reinitialize(): Promise<void> {
    await this.initialize();
  }
}
