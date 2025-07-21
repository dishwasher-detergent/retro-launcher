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
    };
    nfcAPI: {
      getCurrentCard: () => Promise<NFCCardData | null>;
      getNFCStatus: () => Promise<NFCStatus>;
      reconnectNFC: () => Promise<{ success: boolean }>;
      sendCommand: (command: string) => Promise<{ success: boolean }>;
      writeNFCCard: (
        cardData: NFCCardData
      ) => Promise<{ success: boolean; error?: string }>;
      hideToTray: () => Promise<{ success: boolean }>;
      onCardDetected: (callback: (cardData: NFCCardData) => void) => void;
      onNFCStatusChange: (callback: (status: NFCStatus) => void) => void;
      onApplicationLaunched: (
        callback: (data: ApplicationEvent) => void
      ) => void;
      onLaunchError: (callback: (data: LaunchError) => void) => void;
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
