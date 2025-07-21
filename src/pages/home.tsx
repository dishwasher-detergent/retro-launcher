import { useEffect, useState } from "react";
import { NFCCardData } from "../types/electron";

export function HomePage() {
  const [currentCard, setCurrentCard] = useState<NFCCardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeData();

    if (window.nfcAPI) {
      window.nfcAPI.onCardDetected((cardData: NFCCardData) => {
        setCurrentCard(cardData);
      });
    }

    return () => {
      // Cleanup listeners
      if (window.nfcAPI) {
        window.nfcAPI.removeAllListeners("nfc-card-data");
      }
    };
  }, []);

  const initializeData = async () => {
    if (window.nfcAPI) {
      try {
        const card = await window.nfcAPI.getCurrentCard();
        setCurrentCard(card);
      } catch (error) {
        console.error("Failed to initialize data:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-background text-foreground flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading NFC Reader...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Current Game</h1>
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
    </>
  );
}
