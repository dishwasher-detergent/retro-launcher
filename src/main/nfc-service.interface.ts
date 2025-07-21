// SerialPort type definitions
export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  productId?: string;
  vendorId?: string;
}

export interface SerialPortConstructorOptions {
  path: string;
  baudRate: number;
}

export interface SerialPortInstance {
  pipe(parser: ReadlineParserInstance): void;
  on(event: 'open' | 'close', callback: () => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
  isOpen: boolean;
  close(): void;
}

export interface ReadlineParserInstance {
  on(event: 'data', callback: (data: string) => void): void;
}

export interface SerialPortStatic {
  list(): Promise<SerialPortInfo[]>;
  new (options: SerialPortConstructorOptions): SerialPortInstance;
}

export interface ReadlineParserStatic {
  new (): ReadlineParserInstance;
}

// NFC service interfaces
export interface NFCConnectionStatus {
  connected: boolean;
  message?: string;
}

export interface NFCTagData {
  filePath: string;
  description: string;
  icon: string;
}
