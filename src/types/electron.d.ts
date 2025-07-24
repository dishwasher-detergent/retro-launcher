export interface NFCCardData {
  name: string;
  pathName: string;
}

export interface NFCStatus {
  connected: boolean;
}

export interface ApplicationEvent {
  pathName: string;
}

export interface LaunchError {
  pathName: string;
  error: string;
}

export interface DeviceInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
}

declare global {
  interface Window {
    ipcRenderer: {
      on: (
        channel: string,
        listener: (event: any, ...args: any[]) => void
      ) => void;
      off: (channel: string, ...args: any[]) => void;
      send: (channel: string, ...args: any[]) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
    electronAPI: {
      showOpenDialog: (options: {
        properties: string[];
        filters: { name: string; extensions: string[] }[];
      }) => Promise<{ canceled: boolean; filePaths: string[] }>;
      extractExeIcon: (filePath: string) => Promise<{
        success: boolean;
        icon?: string;
        error?: string;
      }>;
    };
    deviceApi: {
      testDevice: (devicePath: string) => Promise<{
        success: boolean;
        responsive?: boolean;
        error?: string;
      }>;
      hasConnectedDevice: () => Promise<boolean>;
      getConnectedDevice: () => Promise<string | null>;
      getSelectedDevice: () => Promise<DeviceInfo | null>;
      onDeviceConnected: (callback: (device: DeviceInfo) => void) => void;
      onDeviceDisconnected: (callback: (device: DeviceInfo) => void) => void;
      onSelectedDeviceChanged: (
        callback: (device: DeviceInfo | null) => void
      ) => void;
      onScanError: (callback: (error: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
    cartridgeApi: {
      getLastCartridge: () => Promise<string | null>;
      sendCommand: (
        command: string
      ) => Promise<{ success: boolean; error?: string }>;
      onCartridgeDetected: (callback: (cartridge: string) => void) => void;
      onCartridgeRemoved: (callback: () => void) => void;
      onNFCError: (callback: (error: any) => void) => void;
      onConnectionError: (callback: (error: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
    windowAPI: {
      minimize: () => Promise<{ success: boolean }>;
      maximize: () => Promise<{ success: boolean }>;
      close: () => Promise<{ success: boolean }>;
      isMaximized: () => Promise<boolean>;
    };
  }
}

export {};
