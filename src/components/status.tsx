import { LucideRefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { NFCStatus } from "../types/electron";
import { Button } from "./ui/button";

export function NFCStatusIndicator() {
  const [nfcStatus, setNFCStatus] = useState<NFCStatus>({ connected: false });

  useEffect(() => {
    const initializeStatus = async () => {
      if (window.nfcAPI) {
        try {
          const status = await window.nfcAPI.getNFCStatus();
          setNFCStatus(status);
        } catch (error) {
          console.error("Failed to get NFC status:", error);
        }
      }
    };

    initializeStatus();

    if (window.nfcAPI) {
      window.nfcAPI.onNFCStatusChange((status: NFCStatus) => {
        setNFCStatus(status);
      });
    }

    return () => {
      if (window.nfcAPI) {
        window.nfcAPI.removeAllListeners("nfc-status");
      }
    };
  }, []);

  const handleReconnect = async () => {
    if (window.nfcAPI) {
      try {
        await window.nfcAPI.reconnectNFC();
      } catch (error) {
        console.error("Failed to reconnect:", error);
      }
    }
  };

  return (
    <div className="no-drag h-full flex items-center">
      {nfcStatus.connected ? (
        <div className="flex flex-row gap-1 items-center no-drag">
          <div className="size-2 rounded-full animate-pulse bg-emerald-600" />
          <p className="font-semibold text-xs text-foreground">
            {nfcStatus.connected ? "Connected" : "Disconnected"}
          </p>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReconnect}
          title="Reconnect"
          className="h-6"
        >
          <div className="size-2 rounded-full animate-pulse bg-destructive" />
          Disconnected
          <LucideRefreshCw className="size-3" />
        </Button>
      )}
    </div>
  );
}
