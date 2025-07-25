import { useLogsContext } from "@/contexts/logs-context";
import { NFCCardData } from "@/types/electron";
import { useEffect, useState } from "react";

export interface Cartridge {
  lastCartridge: NFCCardData | null;
  isConnected: boolean;
  connectedDevicePath: string | null;
  isLoading: boolean;
  sendCommand: (command: string) => Promise<void>;
}

export function useCartridge(): Cartridge {
  const { addLogs } = useLogsContext();
  const [lastCartridge, setLastCartridge] = useState<NFCCardData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevicePath, setConnectedDevicePath] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeCartridgeStatus = async () => {
      if (window.cartridgeApi) {
        try {
          const [lastCartridge, hasConnectedDevice, connectedDevice] =
            await Promise.all([
              window.cartridgeApi.getLastCartridge(),
              window.deviceApi.hasConnectedDevice(),
              window.deviceApi.getConnectedDevice(),
            ]);

          setLastCartridge(
            lastCartridge
              ? (JSON.parse(atob(lastCartridge)) as NFCCardData)
              : null
          );
          setIsConnected(hasConnectedDevice);
          setConnectedDevicePath(connectedDevice);
        } catch (error) {
          addLogs(`Failed to initialize cartridge status: ${error}`);
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeCartridgeStatus();

    if (window.cartridgeApi) {
      window.cartridgeApi.onCartridgeDetected((cartridgeData: string) => {
        setLastCartridge(JSON.parse(atob(cartridgeData)) as NFCCardData);
      });

      window.cartridgeApi.onCartridgeRemoved(() => {
        setLastCartridge(null);
      });

      window.cartridgeApi.onNFCError((errorData: any) => {
        addLogs(`NFC Error: ${errorData.error?.message || "Unknown error"}`);
      });

      window.cartridgeApi.onConnectionError((errorData: any) => {
        addLogs(
          `Connection Error: ${errorData.error?.message || "Unknown error"}`
        );
        setIsConnected(false);
        setConnectedDevicePath(null);
      });
    }

    return () => {
      if (window.cartridgeApi) {
        window.cartridgeApi.removeAllListeners("cartridge-detected");
        window.cartridgeApi.removeAllListeners("cartridge-removed");
        window.cartridgeApi.removeAllListeners("nfc-error");
        window.cartridgeApi.removeAllListeners("cartridge-connection-error");
      }
    };
  }, []);

  const sendCommand = async (command: string): Promise<void> => {
    if (!window.cartridgeApi) {
      throw new Error("Cartridge API not available");
    }

    try {
      const result = await window.cartridgeApi.sendCommand(command);
      if (!result.success) {
        throw new Error(result.error || "Failed to send command");
      }

      addLogs(`Command sent successfully: ${command}`);
    } catch (error) {
      addLogs(`Failed to send command: ${error}`);
      throw error;
    }
  };

  return {
    lastCartridge,
    isConnected,
    connectedDevicePath,
    isLoading,
    sendCommand,
  };
}
