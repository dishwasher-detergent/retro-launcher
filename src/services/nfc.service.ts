import { shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import {
  ERROR_MESSAGES,
  ESP32_IDENTIFIERS,
  SERIAL_COMMANDS,
  SERIAL_CONFIG,
} from '../constants/nfc-service.constants';
import {
  NFCConnectionStatus,
  NFCTagData,
  ReadlineParserInstance,
  ReadlineParserStatic,
  SerialPortInfo,
  SerialPortInstance,
  SerialPortStatic,
} from '../interfaces/nfc-service.interface';

// Constants

let SerialPort: SerialPortStatic | null = null;
let ReadlineParser: ReadlineParserStatic | null = null;

// Try to import serialport, but handle gracefully if not available
try {
  const serialportModule = require('serialport');
  const parserModule = require('@serialport/parser-readline');
  SerialPort = serialportModule.SerialPort;
  ReadlineParser = parserModule.ReadlineParser;
} catch (error) {
  console.log(
    'SerialPort not available:',
    error instanceof Error ? error.message : 'Unknown error',
  );
}

export class NFCService {
  private port: SerialPortInstance | null = null;
  private parser: ReadlineParserInstance | null = null;
  private isConnected = false;
  private connectionAttempts = 0;
  private readonly maxRetries = SERIAL_CONFIG.MAX_RETRIES;
  private readonly retryInterval = SERIAL_CONFIG.RETRY_INTERVAL_MS;
  private serialPortAvailable = false;
  private onTagDetectedCallback?: (tagData: NFCTagData) => void;
  private onTagRemovedCallback?: () => void;
  private onConnectionStatusChangedCallback?: (
    connected: boolean,
    message?: string,
  ) => void;

  constructor() {
    this.serialPortAvailable = SerialPort !== null && ReadlineParser !== null;
    this.initializeConnection();
  }

  private async initializeConnection() {
    try {
      // Check if serialport is available
      if (!this.serialPortAvailable || !SerialPort || !ReadlineParser) {
        console.log('SerialPort modules not available');
        this.onConnectionStatusChangedCallback?.(
          false,
          ERROR_MESSAGES.SERIALPORT_NOT_AVAILABLE,
        );
        return;
      }

      this.connectionAttempts++;

      // Try to find ESP32 (common serial ports for ESP32)
      const ports = await SerialPort.list();
      const esp32Port = ports.find(
        (port: SerialPortInfo) =>
          ESP32_IDENTIFIERS.MANUFACTURERS.some((manufacturer) =>
            port.manufacturer?.toLowerCase().includes(manufacturer),
          ) ||
          port.productId === ESP32_IDENTIFIERS.PRODUCT_ID ||
          port.vendorId === ESP32_IDENTIFIERS.VENDOR_ID,
      );

      if (!esp32Port) {
        console.log(
          'ESP32 not found. Available ports:',
          ports.map(
            (p: SerialPortInfo) => `${p.path} (${p.manufacturer || 'Unknown'})`,
          ),
        );

        if (this.connectionAttempts <= this.maxRetries) {
          console.log(
            `Retrying connection (${this.connectionAttempts}/${this.maxRetries})...`,
          );
          this.onConnectionStatusChangedCallback?.(
            false,
            `ESP32 not found. Retrying... (${this.connectionAttempts}/${this.maxRetries})`,
          );
          setTimeout(() => this.initializeConnection(), this.retryInterval);
        } else {
          console.log('Max retry attempts reached. ESP32 not available.');
          this.onConnectionStatusChangedCallback?.(
            false,
            ERROR_MESSAGES.ESP32_NOT_FOUND,
          );
        }
        return;
      }

      this.port = new SerialPort({
        path: esp32Port.path,
        baudRate: SERIAL_CONFIG.BAUD_RATE,
      });

      this.parser = new ReadlineParser();
      this.port.pipe(this.parser);

      this.port.on('open', () => {
        console.log('Connected to ESP32');
        this.isConnected = true;
        this.connectionAttempts = 0; // Reset attempts on successful connection
        this.onConnectionStatusChangedCallback?.(
          true,
          ERROR_MESSAGES.ESP32_CONNECTED,
        );
      });

      this.port.on('error', (err: Error) => {
        console.error('Serial port error:', err);
        this.isConnected = false;
        this.onConnectionStatusChangedCallback?.(
          false,
          `${ERROR_MESSAGES.CONNECTION_FAILED}: ${err.message}`,
        );
        // Try to reconnect after 5 seconds if not max retries
        if (this.connectionAttempts <= this.maxRetries) {
          setTimeout(() => this.initializeConnection(), this.retryInterval);
        }
      });

      this.port.on('close', () => {
        console.log('ESP32 disconnected');
        this.isConnected = false;
        this.onConnectionStatusChangedCallback?.(
          false,
          ERROR_MESSAGES.ESP32_DISCONNECTED,
        );
        // Try to reconnect after 5 seconds if not max retries
        if (this.connectionAttempts <= this.maxRetries) {
          setTimeout(() => this.initializeConnection(), this.retryInterval);
        }
      });

      this.parser.on('data', (data: string) => {
        this.handleSerialData(data.trim());
      });
    } catch (error) {
      console.error('Failed to connect to ESP32:', error);
      this.onConnectionStatusChangedCallback?.(
        false,
        `${ERROR_MESSAGES.CONNECTION_FAILED}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      if (this.connectionAttempts <= this.maxRetries) {
        setTimeout(() => this.initializeConnection(), this.retryInterval);
      }
    }
  }

  private handleSerialData(data: string) {
    console.log('Received from ESP32:', data);

    try {
      if (data === SERIAL_COMMANDS.TAG_REMOVED) {
        this.onTagRemovedCallback?.();
        return;
      }

      // Try to parse JSON data from NFC tag
      const tagData: NFCTagData = JSON.parse(data);

      // Validate the tag data structure
      if (tagData.filePath && tagData.description && tagData.icon) {
        this.onTagDetectedCallback?.(tagData);
        this.openFile(tagData.filePath);
      } else {
        console.error(`${ERROR_MESSAGES.INVALID_TAG_DATA}:`, tagData);
      }
    } catch (error) {
      console.error('Failed to parse NFC tag data:', error);
    }
  }

  private openFile(filePath: string) {
    try {
      // Check if file exists
      if (fs.existsSync(filePath)) {
        shell.openPath(filePath);
        console.log('Opened file:', filePath);
      } else {
        console.error(`${ERROR_MESSAGES.FILE_NOT_FOUND}:`, filePath);
        // Try to open the directory containing the file
        const dir = path.dirname(filePath);
        if (fs.existsSync(dir)) {
          shell.openPath(dir);
          console.log('Opened directory:', dir);
        }
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }

  public onTagDetected(callback: (tagData: NFCTagData) => void) {
    this.onTagDetectedCallback = callback;
  }

  public onTagRemoved(callback: () => void) {
    this.onTagRemovedCallback = callback;
  }

  public onConnectionStatusChanged(
    callback: (connected: boolean, message?: string) => void,
  ) {
    this.onConnectionStatusChangedCallback = callback;
  }

  public getConnectionStatus(): NFCConnectionStatus {
    return {
      connected: this.isConnected,
      message: this.isConnected ? 'ESP32 connected' : 'ESP32 not connected',
    };
  }

  public dispose() {
    if (this.port && this.port.isOpen) {
      this.port.close();
    }
  }
}
