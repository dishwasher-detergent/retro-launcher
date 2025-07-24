#include <SPI.h>
#include <MFRC522.h>

// Pin definitions
#define SS_PIN 5
#define RST_PIN 27

// Constants
#define DEVICE_ID "RETRO_LAUNCHER"

MFRC522 rfid(SS_PIN, RST_PIN);

// State tracking for NFC card presence
bool lastCardPresent = false;
unsigned long lastCardCheckTime = 0;
const unsigned long CARD_CHECK_INTERVAL = 100; // Check every 100ms

void setup() {
  Serial.begin(115200);
  
  unsigned long startTime = millis();
  while (!Serial && (millis() - startTime < 5000)) {
    delay(10);
  }

  SPI.begin();
  rfid.PCD_Init();
  
  Serial.println("Commands: WHO_ARE_YOU, WRITE_DATA:<data>");
}

void loop() {
  handleSerialCommands();
  checkForNfcCardChanges();

  delay(50);
}

/**
 * Handle incoming serial commands
 */
void handleSerialCommands() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command.length() == 0) return;
    
    if (command == "WHO_ARE_YOU") {
      Serial.println(DEVICE_ID);
    }
    else if (command.startsWith("WRITE_DATA:")) {
      String dataToWrite = command.substring(11);
      dataToWrite.trim();
      if (dataToWrite.length() == 0) {
        Serial.println("ERROR: No data provided to write");
        return;
      }
      
      bool cardFound = false;
      
      // Only allow writing to cards that are already present
      if (lastCardPresent) {
        // Try to communicate with the already present card
        byte bufferATQA[2];
        byte bufferSize = sizeof(bufferATQA);
        
        MFRC522::StatusCode result = rfid.PICC_WakeupA(bufferATQA, &bufferSize);
        if (result == MFRC522::STATUS_OK || result == MFRC522::STATUS_COLLISION) {
          if (rfid.PICC_ReadCardSerial()) {
            cardFound = true;
            Serial.println("Writing to already present NFC card...");
          }
        }
      }
      
      if (!cardFound) {
        Serial.println("ERROR: No NFC card present for writing");
        return;
      }
      
      bool writeOk = writeNtagTextRecord(4, dataToWrite);
      if (writeOk) {
        Serial.println("WRITE_OK");
      } else {
        Serial.println("ERROR: Write failed");
      }
      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();
    }
    else {
      Serial.println("ERROR: Unknown command: " + command);
    }
  }
}

/**
 * Write a simple NDEF text record to NTAG215 starting at a given page
 */
bool writeNtagTextRecord(byte startPage, const String &text) {
  // NDEF text record header for longer data
  byte langLen = 2;
  String lang = "en";
  byte textLen = text.length();
  byte payloadLen = 1 + langLen + textLen; // 1 byte status + lang + text
  
  // Calculate total NDEF message length
  int ndefMessageLen = 5 + langLen + textLen; // D1 01 <payloadLen> 54 <langLen> <lang> <text>
  
  if (ndefMessageLen > 480) return false; // NTAG215 has ~504 bytes user area, leave some buffer

  byte ndef[500] = {0}; // Increased buffer size for larger data
  int ndefIndex = 0;
  
  // NDEF TLV header
  ndef[ndefIndex++] = 0x03; // NDEF TLV
  
  // Handle length field - use 3-byte format for lengths > 254
  if (ndefMessageLen <= 254) {
    ndef[ndefIndex++] = ndefMessageLen; // Single byte length
  } else {
    ndef[ndefIndex++] = 0xFF; // Extended length indicator
    ndef[ndefIndex++] = (ndefMessageLen >> 8) & 0xFF; // High byte
    ndef[ndefIndex++] = ndefMessageLen & 0xFF; // Low byte
  }
  
  // NDEF Record header
  ndef[ndefIndex++] = 0xD1; // NDEF header (MB/ME/SR/TNF=1)
  ndef[ndefIndex++] = 0x01; // type length
  ndef[ndefIndex++] = payloadLen; // payload length
  ndef[ndefIndex++] = 0x54; // 'T' (text record)
  ndef[ndefIndex++] = langLen; // language code length
  ndef[ndefIndex++] = 'e';
  ndef[ndefIndex++] = 'n';
  
  // Add the actual text data
  for (int i = 0; i < textLen; i++) {
    ndef[ndefIndex++] = text[i];
  }
  
  ndef[ndefIndex++] = 0xFE; // NDEF terminator

  // Write 4 bytes per page
  int totalBytes = ndefIndex;
  for (int i = 0; i < (totalBytes + 3) / 4; i++) {
    byte pageBuf[4];
    for (byte j = 0; j < 4; j++) {
      if (i * 4 + j < totalBytes) {
        pageBuf[j] = ndef[i * 4 + j];
      } else {
        pageBuf[j] = 0x00; // Pad with zeros
      }
    }
    MFRC522::StatusCode status = rfid.MIFARE_Ultralight_Write(startPage + i, pageBuf, 4);
    if (status != MFRC522::STATUS_OK) {
      return false;
    }
  }
  return true;
}

/**
 * Check for NFC card presence changes and handle detection/removal
 */
void checkForNfcCardChanges() {
  unsigned long currentTime = millis();
  
  // Throttle the checking to avoid excessive polling
  if (currentTime - lastCardCheckTime < CARD_CHECK_INTERVAL) {
    return;
  }
  lastCardCheckTime = currentTime;
  
  // Try to select a card (this works for both new and existing cards)
  bool cardPresent = false;
  
  // First check if there's a new card
  if (rfid.PICC_IsNewCardPresent()) {
    if (rfid.PICC_ReadCardSerial()) {
      cardPresent = true;
    }
  } else {
    // If no new card, try to communicate with an existing card
    // This is a more reliable way to check if a card is still present
    byte bufferATQA[2];
    byte bufferSize = sizeof(bufferATQA);
    
    // Try to wake up a card that might still be in the field
    MFRC522::StatusCode result = rfid.PICC_WakeupA(bufferATQA, &bufferSize);
    if (result == MFRC522::STATUS_OK || result == MFRC522::STATUS_COLLISION) {
      // A card responded, so one is present
      cardPresent = true;
      // Try to select it to get UID
      if (rfid.PICC_ReadCardSerial()) {
        // Successfully read the card
      }
    }
  }
  
  // Handle state changes
  if (cardPresent) {
    if (!lastCardPresent) {
      // Card was just inserted - read and report data
      handleCardDetected();
      lastCardPresent = true;
    }
    // Card is still present, do nothing
    
    // Always halt and stop crypto after checking
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  } else {
    // No card present
    if (lastCardPresent) {
      // Card was present but now removed
      Serial.println("NFC_REMOVED");
      lastCardPresent = false;
    }
  }
}

/**
 * Handle when a new NFC card is detected
 */
void handleCardDetected() {
  String nfcUid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      nfcUid += "0";
    }
    nfcUid += String(rfid.uid.uidByte[i], HEX);
  }
  nfcUid.toUpperCase();

  String nfcData = readNtagData(4);
  
  Serial.println("NFC_DATA_START");
  Serial.print("UID:");
  Serial.println(nfcUid);
  if (nfcData.length() > 0) {
    Serial.print("DATA:");
    Serial.println(nfcData);
  }
  Serial.println("NFC_DATA_END");
}

/**
 * Read data from NTAG215 (NFC Forum Type 2) starting from a specific page
 */
String readNtagData(byte startPage) {
  byte buffer[18];
  byte size = sizeof(buffer);
  String data = "";
  
  // Read the first block to find NDEF structure
  MFRC522::StatusCode status = rfid.MIFARE_Read(startPage, buffer, &size);
  if (status != MFRC522::STATUS_OK) {
    return "";
  }
  
  // Look for NDEF TLV (0x03)
  int ndefStart = -1;
  int ndefLength = 0;
  
  for (int i = 0; i < 16; i++) {
    if (buffer[i] == 0x03) { // Found NDEF TLV
      ndefStart = i;
      // Check if it's extended length format
      if (i + 1 < 16) {
        if (buffer[i + 1] == 0xFF) {
          // Extended length format: 03 FF <high byte> <low byte>
          if (i + 3 < 16) {
            ndefLength = (buffer[i + 2] << 8) | buffer[i + 3];
            ndefStart = i + 4; // Start of actual NDEF message
          }
        } else {
          // Single byte length format: 03 <length>
          ndefLength = buffer[i + 1];
          ndefStart = i + 2; // Start of actual NDEF message
        }
      }
      break;
    }
  }
  
  if (ndefStart == -1) {
    return ""; // No NDEF found
  }
  
  // Now read the NDEF message starting from ndefStart
  // We need to read across multiple pages to get all the data
  String fullData = "";
  int bytesRead = 0;
  int targetBytes = min(ndefLength, 480); // Don't read more than reasonable
  
  for (byte page = startPage; page < startPage + 120 && bytesRead < targetBytes; page += 4) {
    status = rfid.MIFARE_Read(page, buffer, &size);
    if (status != MFRC522::STATUS_OK) {
      break;
    }
    
    for (int i = 0; i < 16 && bytesRead < targetBytes; i++) {
      int globalIndex = (page - startPage) * 4 + i;
      if (globalIndex >= ndefStart && globalIndex < ndefStart + ndefLength) {
        fullData += (char)buffer[i];
        bytesRead++;
      }
    }
  }
  
  // Now parse the NDEF message to extract the text payload
  // Look for text record: D1 01 <payload_len> 54 <lang_len> <lang> <text>
  for (int i = 0; i < fullData.length() - 5; i++) {
    if (fullData[i] == (char)0xD1 && fullData[i+1] == (char)0x01 && fullData[i+3] == (char)0x54) {
      int payloadLen = (byte)fullData[i+2];
      int langLen = (byte)fullData[i+4];
      int textStart = i + 5 + langLen;
      
      if (textStart < fullData.length()) {
        // Extract the text, stopping at terminator or payload end
        for (int j = textStart; j < fullData.length() && j < textStart + payloadLen - 1 - langLen; j++) {
          char c = fullData[j];
          if (c == (char)0xFE || c == (char)0x00) break; // Stop at terminator
          if (c >= 0x20 && c <= 0x7E) { // Printable ASCII
            data += c;
          }
        }
        return data;
      }
    }
  }
  
  return data;
}