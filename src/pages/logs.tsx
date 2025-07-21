import { Button } from "@/components/ui/button";
import { LucideBrushCleaning } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ApplicationEvent,
  LaunchError,
  NFCCardData,
  NFCStatus,
} from "../types/electron";

export function LogsPage() {
  const [notifications, setNotifications] = useState<string[]>([]);

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

  const addNotification = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const timestampedMessage = `[${timestamp}] ${message}`;
    setNotifications((prev) => [timestampedMessage, ...prev]);
  };

  const clearLogs = () => {
    setNotifications([]);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold mb-4">System Logs</h1>
        <Button variant="secondary" onClick={clearLogs}>
          <LucideBrushCleaning />
          Clear Logs
        </Button>
      </div>

      <div className="bg-muted rounded-lg p-4 h-96 overflow-y-auto">
        {notifications.map((notification, index) => (
          <p
            key={index}
            className="text-sm text-muted-foreground font-mono mb-1"
          >
            {notification}
          </p>
        ))}
        {notifications.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No log entries yet. Interact with the NFC reader to see system
            events.
          </p>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        <p>System events are automatically logged here.</p>
      </div>
    </>
  );
}
