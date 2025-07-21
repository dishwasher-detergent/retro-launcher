import { EventEmitter } from "events";
import {
  ESP32_CONNECTION_TIMEOUT,
  ESP32_RECONNECT_INTERVAL,
} from "../constants/nfc.constant";

export class DeviceConnectionService extends EventEmitter {
  private device: any = null;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  public async connect(device: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.device = device;

      const timeout = setTimeout(() => {
        this.device?.close();
        reject(new Error("Connection timeout"));
      }, ESP32_CONNECTION_TIMEOUT);

      this.device.on("open", () => {
        clearTimeout(timeout);
        this.isConnected = true;
        console.log(`Device connected successfully`);
        this.emit("connected");
        resolve();
      });

      this.device.on("error", (error: any) => {
        clearTimeout(timeout);
        console.error("Device connection error:", error);
        this.handleDisconnection();
        reject(error);
      });

      this.device.on("close", () => {
        console.log("Device connection closed");
        this.handleDisconnection();
      });

      this.device.open();
    });
  }

  private handleDisconnection(): void {
    this.isConnected = false;
    this.emit("disconnected");
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      if (!this.isConnected) {
        this.emit("reconnectRequested");
      }
    }, ESP32_RECONNECT_INTERVAL);
  }

  public sendCommand(command: string): void {
    if (this.device && this.isConnected) {
      this.device.write(command + "\n");
    } else {
      console.warn("Cannot send command: Device not connected");
    }
  }

  public setupDataHandler(callback: (data: string) => void): void {
    if (!this.device) return;

    let buffer = "";

    this.device.on("data", (data: Buffer) => {
      buffer += data.toString();

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          callback(trimmedLine);
        }
      }
    });
  }

  public get connected(): boolean {
    return this.isConnected && this.device && this.device.isOpen;
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.device && this.device.isOpen) {
      this.device.close();
    }

    this.device = null;
    this.isConnected = false;
  }
}
