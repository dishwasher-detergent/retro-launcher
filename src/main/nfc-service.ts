import { shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import {
  NFCConnectionStatus,
  NFCTagData,
  ReadlineParserInstance,
  ReadlineParserStatic,
  SerialPortInfo,
  SerialPortInstance,
  SerialPortStatic,
} from './nfc-service.interface';

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
  private maxRetries = 3;
  private retryInterval = 5000; // 5 seconds
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
          'SerialPort not available. Please install serialport dependencies.',
        );
        return;
      }

      this.connectionAttempts++;

      // Try to find ESP32 (common serial ports for ESP32)
      const ports = await SerialPort.list();
      const esp32Port = ports.find(
        (port: SerialPortInfo) =>
          port.manufacturer?.toLowerCase().includes('espressif') ||
          port.manufacturer?.toLowerCase().includes('silicon labs') ||
          port.productId === '7523' || // Common ESP32 product ID
          port.vendorId === '10c4', // Common ESP32 vendor ID
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
            'ESP32 not found after multiple attempts. Please check connection.',
          );
        }
        return;
      }

      this.port = new SerialPort({
        path: esp32Port.path,
        baudRate: 115200,
      });

      this.parser = new ReadlineParser();
      this.port.pipe(this.parser);

      this.port.on('open', () => {
        console.log('Connected to ESP32');
        this.isConnected = true;
        this.connectionAttempts = 0; // Reset attempts on successful connection
        this.onConnectionStatusChangedCallback?.(
          true,
          'ESP32 connected successfully',
        );
      });

      this.port.on('error', (err: Error) => {
        console.error('Serial port error:', err);
        this.isConnected = false;
        this.onConnectionStatusChangedCallback?.(
          false,
          `Serial port error: ${err.message}`,
        );
        // Try to reconnect after 5 seconds if not max retries
        if (this.connectionAttempts <= this.maxRetries) {
          setTimeout(() => this.initializeConnection(), this.retryInterval);
        }
      });

      this.port.on('close', () => {
        console.log('ESP32 disconnected');
        this.isConnected = false;
        this.onConnectionStatusChangedCallback?.(false, 'ESP32 disconnected');
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
        `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      if (this.connectionAttempts <= this.maxRetries) {
        setTimeout(() => this.initializeConnection(), this.retryInterval);
      }
    }
  }

  private handleSerialData(data: string) {
    console.log('Received from ESP32:', data);

    try {
      if (data === 'TAG_REMOVED') {
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
        console.error('Invalid tag data structure:', tagData);
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
        console.error('File not found:', filePath);
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
