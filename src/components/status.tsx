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
    <div className="flex flex-row gap-1 items-center no-drag">
      <div
        className={`h-2 w-2 rounded-full animate-pulse ${
          nfcStatus.connected ? "bg-emerald-600" : "bg-destructive"
        }`}
      />
      <p className="font-semibold text-xs">
        {nfcStatus.connected ? "Connected" : "Disconnected"}
      </p>
      {!nfcStatus.connected && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-muted rounded-sm"
          onClick={handleReconnect}
          title="Reconnect NFC"
        >
          <LucideRefreshCw className="size-3" />
        </Button>
      )}
    </div>
  );
}
