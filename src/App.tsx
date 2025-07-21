import { LucideRefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./components/ui/button";
import { NFCCardData, NFCStatus } from "./types/electron";

function App() {
  const [currentCard, setCurrentCard] = useState<NFCCardData | null>(null);
  const [nfcStatus, setNFCStatus] = useState<NFCStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    initializeData();

    if (window.nfcAPI) {
      window.nfcAPI.onCardDetected((cardData: NFCCardData) => {
        setCurrentCard(cardData);
        addNotification(`Card detected: ${cardData.name}`);
      });

      window.nfcAPI.onNFCStatusChange((status: NFCStatus) => {
        console.log("NFC status changed:", status);

        setNFCStatus(status);
        addNotification(
          status.connected ? "NFC Connected" : "NFC Disconnected"
        );
      });

      window.nfcAPI.onApplicationLaunched((data) => {
        addNotification(`Launched: ${data.pathName}`);
      });

      window.nfcAPI.onLaunchError((data) => {
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

  const initializeData = async () => {
    if (window.nfcAPI) {
      try {
        const [card, status] = await Promise.all([
          window.nfcAPI.getCurrentCard(),
          window.nfcAPI.getNFCStatus(),
        ]);
        setCurrentCard(card);
        setNFCStatus(status);
      } catch (error) {
        console.error("Failed to initialize data:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  const addNotification = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const timestampedMessage = `[${timestamp}] ${message}`;
    setNotifications((prev) => [timestampedMessage, ...prev.slice(-16)]);
  };

  const handleReconnect = async () => {
    if (window.nfcAPI) {
      try {
        await window.nfcAPI.reconnectNFC();
        addNotification("Reconnecting to ESP32...");
      } catch (error) {
        console.error("Failed to reconnect:", error);
        addNotification("Failed to reconnect");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading NFC Reader...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-background text-foreground">
      <div className="flex flex-row gap-1 items-center mb-2">
        <div
          className={`h-2 w-2 rounded-full animate-pulse ${
            nfcStatus.connected ? "bg-emerald-600" : "bg-destructive"
          }`}
        />
        <p className="font-semibold text-sm">
          {nfcStatus.connected ? "Connected" : "Disconnected"}
        </p>
        {!nfcStatus.connected && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={handleReconnect}
          >
            <LucideRefreshCw className="size-3" />
          </Button>
        )}
      </div>
      <h2 className="text-xl font-bold mb-2">Current Game</h2>
      <div className="bg-muted rounded-lg p-2 mb-6">
        {currentCard ? (
          <div className="flex items-start gap-4">
            {currentCard.icon && (
              <div className="size-16 bg-primary rounded-lg grid place-items-center">
                <img
                  src={currentCard.icon}
                  alt={currentCard.name}
                  className="w-12 h-12 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
                <span className="text-2xl">🎮</span>
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold">{currentCard.name}</h3>
              <p className="text-muted-foreground text-sm">
                {currentCard.pathName}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center p-2 text-muted-foreground">
            <p className="font-semibold">No cartridge detected</p>
            <p className="text-sm">Place a cartridge in the reader.</p>
          </div>
        )}
      </div>
      <h2 className="text-xl font-bold mb-2">Logs</h2>
      <div className="bg-muted rounded-lg p-4 h-60 overflow-y-auto">
        {notifications.map((notification, index) => (
          <p key={index} className="text-sm text-muted-foreground">
            {notification}
          </p>
        ))}
        {notifications.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No notifications yet. Interact with the NFC reader to see logs.
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
