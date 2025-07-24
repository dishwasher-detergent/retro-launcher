export interface NFCCardData {
  name: string;
  icon: string | null;
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
      getDevices: () => Promise<DeviceInfo[]>;
      hasDevices: () => Promise<boolean>;
      testDevice: (devicePath: string) => Promise<{
        success: boolean;
        responsive?: boolean;
        error?: string;
      }>;
      startPolling: () => Promise<{ success: boolean; error?: string }>;
      stopPolling: () => Promise<{ success: boolean; error?: string }>;
      getSelectedDevice: () => Promise<DeviceInfo | null>;
      setSelectedDevice: (
        device: DeviceInfo | null
      ) => Promise<{ success: boolean; error?: string }>;
      hasSelectedDevice: () => Promise<boolean>;
      onDeviceConnected: (callback: (device: DeviceInfo) => void) => void;
      onDeviceDisconnected: (callback: (device: DeviceInfo) => void) => void;
      onSelectedDeviceChanged: (
        callback: (device: DeviceInfo | null) => void
      ) => void;
      onScanError: (callback: (error: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
    cartridgeApi: {
      getLastCartridge: () => Promise<CartridgeData | null>;
      sendCommand: (
        command: string
      ) => Promise<{ success: boolean; error?: string }>;
      requestLastNFC: () => Promise<{ success: boolean; error?: string }>;
      writeToCartridge: (
        data: string
      ) => Promise<{ success: boolean; error?: string }>;
      hasConnectedDevice: () => Promise<boolean>;
      getConnectedDevice: () => Promise<string | null>;
      onCartridgeDetected: (
        callback: (cartridge: CartridgeData) => void
      ) => void;
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
