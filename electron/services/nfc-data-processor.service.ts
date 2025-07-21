import { NFCCardData } from "../interfaces/nfc-card-data.interface";

export class NFCDataProcessor {
  public processIncomingData(data: string): NFCCardData | null {
    if (!data) return null;

    try {
      const parsedData = JSON.parse(data) as NFCCardData;

      if (this.isValidNFCCardData(parsedData)) {
        console.log("NFC card detected:", parsedData);
        return parsedData;
      } else {
        console.warn("Invalid NFC card data received:", data);
        return null;
      }
    } catch (error) {
      console.log("ESP32 debug:", data);
      return null;
    }
  }

  private isValidNFCCardData(data: any): data is NFCCardData {
    return (
      typeof data === "object" &&
      data !== null &&
      typeof data.name === "string" &&
      typeof data.icon === "string" &&
      typeof data.pathName === "string"
    );
  }
}
