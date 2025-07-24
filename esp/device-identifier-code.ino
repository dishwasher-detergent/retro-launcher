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
      Serial.println("Present NFC card to write...");
      unsigned long start = millis();
      bool cardFound = false;
      while (millis() - start < 8000) { // Wait up to 8 seconds
        if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
          cardFound = true;
          break;
        }
        delay(50);
      }
      if (!cardFound) {
        Serial.println("ERROR: No NFC card detected");
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
  // NDEF text record header: 0x03, length, 0xD1, 0x01, payloadLen, 0x54, langLen, 'en', <text>, 0xFE
  byte langLen = 2;
  String lang = "en";
  byte textLen = text.length();
  byte payloadLen = 1 + langLen + textLen; // 1 byte status + lang + text
  byte ndefLen = 7 + textLen; // header + text
  if (ndefLen > 48) return false; // Too long for typical NTAG215 user area

  byte ndef[48] = {0};
  ndef[0] = 0x03; // NDEF TLV
  ndef[1] = 5 + langLen + textLen; // length of NDEF message
  ndef[2] = 0xD1; // NDEF header (MB/ME/SR/TNF=1)
  ndef[3] = 0x01; // type length
  ndef[4] = 1 + langLen + textLen; // payload length
  ndef[5] = 0x54; // 'T' (text record)
  ndef[6] = langLen; // language code length
  ndef[7] = 'e';
  ndef[8] = 'n';
  for (byte i = 0; i < textLen; i++) {
    ndef[9 + i] = text[i];
  }
  ndef[9 + textLen] = 0xFE; // NDEF terminator

  // Write 4 bytes per page
  for (byte i = 0; i < (10 + textLen + 3) / 4; i++) {
    byte pageBuf[4];
    for (byte j = 0; j < 4; j++) {
      pageBuf[j] = ndef[i * 4 + j];
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
  
  String data = "UID:" + nfcUid;
  if (nfcData.length() > 0) {
    data += ",DATA:" + nfcData;
  }

  Serial.println("NFC_DETECTED:" + data);
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
  
  // Look for NDEF structure
  // Typical NDEF starts with: 0x03 (NDEF Message TLV), length, then record
  // We need to skip the NDEF headers and find the actual text payload
  
  bool foundNdefStart = false;
  byte payloadStart = 0;
  byte payloadLength = 0;
  
  // Search through the first few reads for NDEF text record
  for (byte page = startPage; page < startPage + 12; page += 4) {
    status = rfid.MIFARE_Read(page, buffer, &size);
    if (status != MFRC522::STATUS_OK) {
      break;
    }
    
    // Look for text record pattern in the 16 bytes
    for (byte i = 0; i < 13; i++) {  // Leave room to check ahead
      // Look for NDEF text record: 0xD1 0x01 <length> 0x54 <lang_len> <lang> <text>
      // Or simple text pattern: 0x54 0x02 'e' 'n' <text>
      if (buffer[i] == 0x54 && i + 3 < 16) {  // 'T' record type
        byte langLen = buffer[i + 1];
        if (langLen <= 5 && i + 2 + langLen < 16) {  // Reasonable language length
          payloadStart = i + 2 + langLen;  // Skip 'T', lang length, and language code
          foundNdefStart = true;
          
          // Extract text data starting from payloadStart
          for (byte j = payloadStart; j < 16; j++) {
            if (buffer[j] == 0x00 || buffer[j] == 0xFE) {
              // Stop at null or NDEF terminator
              return data;
            }
            if (buffer[j] >= 0x20 && buffer[j] <= 0x7E) {
              data += (char)buffer[j];
            }
          }
          
          // If we need more data, continue reading next pages
          if (data.length() > 0) {
            // Read additional pages if needed
            for (byte nextPage = page + 4; nextPage < 135 && data.length() < 50; nextPage += 4) {
              status = rfid.MIFARE_Read(nextPage, buffer, &size);
              if (status != MFRC522::STATUS_OK) break;
              
              for (byte k = 0; k < 16; k++) {
                if (buffer[k] == 0x00 || buffer[k] == 0xFE) {
                  return data;
                }
                if (buffer[k] >= 0x20 && buffer[k] <= 0x7E) {
                  data += (char)buffer[k];
                }
              }
            }
          }
          return data;
        }
      }
    }
  }
  
  // If no NDEF structure found, fall back to simple text extraction
  for (byte page = startPage; page < startPage + 8; page += 4) {
    status = rfid.MIFARE_Read(page, buffer, &size);
    if (status != MFRC522::STATUS_OK) break;
    
    for (byte i = 0; i < 16; i++) {
      if (buffer[i] >= 0x20 && buffer[i] <= 0x7E) {
        data += (char)buffer[i];
      }
    }
  }
  
  return data;
}