import { NFCCardData } from "@/types/electron";
import { useEffect, useState } from "react";

export interface CartridgeStatus {
  lastCartridge: NFCCardData | null;
  isConnected: boolean;
  connectedDevicePath: string | null;
  isLoading: boolean;
  error: string | null;
  sendCommand: (command: string) => Promise<void>;
}

export function useCartridge(): CartridgeStatus {
  const [lastCartridge, setLastCartridge] = useState<NFCCardData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevicePath, setConnectedDevicePath] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          console.error("Failed to initialize cartridge status:", error);
          setError(error instanceof Error ? error.message : "Unknown error");
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeCartridgeStatus();

    if (window.cartridgeApi) {
      // Listen for cartridge detection events
      window.cartridgeApi.onCartridgeDetected((cartridgeData: string) => {
        setLastCartridge(JSON.parse(atob(cartridgeData)) as NFCCardData);
        setError(null);
      });

      // Listen for cartridge removal events
      window.cartridgeApi.onCartridgeRemoved(() => {
        setLastCartridge(null);
        setError(null);
      });

      // Listen for NFC errors
      window.cartridgeApi.onNFCError((errorData: any) => {
        console.error("NFC Error:", errorData);
        setError(errorData.error?.message || "NFC error occurred");
      });

      // Listen for connection errors
      window.cartridgeApi.onConnectionError((errorData: any) => {
        console.error("Connection Error:", errorData);
        setError(errorData.error?.message || "Connection error occurred");
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
      setError(null);
      const result = await window.cartridgeApi.sendCommand(command);
      if (!result.success) {
        throw new Error(result.error || "Failed to send command");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setError(errorMessage);
      throw error;
    }
  };

  return {
    lastCartridge,
    isConnected,
    connectedDevicePath,
    isLoading,
    error,
    sendCommand,
  };
}
