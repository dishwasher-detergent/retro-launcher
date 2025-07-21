import { NFCConnectionStatus, NFCTagData } from './nfc-service.interface';

// IPC Channel types
export type IPCChannels =
  | 'ipc-example'
  | 'nfc-status-changed'
  | 'nfc-tag-detected'
  | 'nfc-tag-removed';

// Electron API interfaces
export interface ElectronNFCAPI {
  getStatus(): Promise<NFCConnectionStatus>;
  onStatusChanged(callback: (status: NFCConnectionStatus) => void): () => void;
  onTagDetected(callback: (tagData: NFCTagData) => void): () => void;
  onTagRemoved(callback: () => void): () => void;
}

export interface ElectronAppAPI {
  showMainWindow(): Promise<void>;
}

export interface ElectronIPCAPI {
  sendMessage(channel: IPCChannels, ...args: unknown[]): void;
  on(channel: IPCChannels, func: (...args: unknown[]) => void): () => void;
  once(channel: IPCChannels, func: (...args: unknown[]) => void): void;
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
}

export interface ElectronHandler {
  ipcRenderer: ElectronIPCAPI;
  nfc: ElectronNFCAPI;
  app: ElectronAppAPI;
}
