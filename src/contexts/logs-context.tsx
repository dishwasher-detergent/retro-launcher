import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { DeviceInfo } from "@/types/electron";

interface LogsContextType {
  logs: string[];
  addLogs: (message: string) => void;
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
  const [logs, setlogs] = useState<string[]>([]);

  const addLogs = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const timestampedMessage = `[${timestamp}] ${message}`;
    setlogs((prev) => [timestampedMessage, ...prev]);
  }, []);

  const clearLogs = useCallback(() => {
    setlogs([]);
  }, []);

  useEffect(() => {
    if (window.deviceApi) {
      window.deviceApi.onDeviceConnected((device: DeviceInfo) => {
        addLogs(
          `Device connected: ${device.path}${
            device.manufacturer ? ` (${device.manufacturer})` : ""
          }`
        );
      });

      window.deviceApi.onDeviceDisconnected((device: DeviceInfo) => {
        addLogs(
          `Device disconnected: ${device.path}${
            device.manufacturer ? ` (${device.manufacturer})` : ""
          }`
        );
      });

      window.deviceApi.onScanError((error: any) => {
        const errorMessage =
          typeof error === "string"
            ? error
            : error.message || "Unknown scan error";
        addLogs(`Device scan error: ${errorMessage}`);
      });
    }

    return () => {
      // Cleanup listeners
      if (window.deviceApi) {
        window.deviceApi.removeAllListeners("device-connected");
        window.deviceApi.removeAllListeners("device-disconnected");
        window.deviceApi.removeAllListeners("device-scan-error");
      }
    };
  }, []);

  const value: LogsContextType = {
    logs,
    addLogs,
    clearLogs,
  };

  return <LogsContext.Provider value={value}>{children}</LogsContext.Provider>;
};
