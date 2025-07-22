import React, { createContext, useContext, useEffect, useState } from "react";
import {
  ApplicationEvent,
  LaunchError,
  NFCCardData,
  NFCStatus,
} from "../types/electron";

interface LogsContextType {
  notifications: string[];
  addNotification: (message: string) => void;
  clearLogs: () => void;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export const useLogsContext = () => {
  const context = useContext(LogsContext);
  if (!context) {
    throw new Error("useLogsContext must be used within a LogsProvider");
  }
  return context;
};

interface LogsProviderProps {
  children: React.ReactNode;
}

export const LogsProvider: React.FC<LogsProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<string[]>([]);

  const addNotification = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const timestampedMessage = `[${timestamp}] ${message}`;
    setNotifications((prev) => [timestampedMessage, ...prev]);
  };

  const clearLogs = () => {
    setNotifications([]);
  };

  useEffect(() => {
    if (window.nfcAPI) {
      window.nfcAPI.onCardDetected((cardData: NFCCardData) => {
        addNotification(`Card detected: ${cardData.name}`);
      });

      window.nfcAPI.onNFCStatusChange((status: NFCStatus) => {
        console.log("NFC status changed:", status);
        addNotification(
          status.connected ? "NFC Connected" : "NFC Disconnected"
        );
      });

      window.nfcAPI.onApplicationLaunched((data: ApplicationEvent) => {
        addNotification(`Launched: ${data.pathName}`);
      });

      window.nfcAPI.onLaunchError((data: LaunchError) => {
        addNotification(`Launch failed: ${data.pathName} - ${data.error}`);
      });
    }

    return () => {
      // Cleanup listeners
      if (window.nfcAPI) {
        window.nfcAPI.removeAllListeners("nfc-card-data");
        window.nfcAPI.removeAllListeners("nfc-status");
        window.nfcAPI.removeAllListeners("application-launched");
        window.nfcAPI.removeAllListeners("launch-error");
      }
    };
  }, []);

  const value: LogsContextType = {
    notifications,
    addNotification,
    clearLogs,
  };

  return <LogsContext.Provider value={value}>{children}</LogsContext.Provider>;
};
