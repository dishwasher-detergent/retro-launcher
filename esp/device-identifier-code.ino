#include <SPI.h>
#include <MFRC522.h>

// Pin definitions
#define SS_PIN 5
#define RST_PIN 27

// Constants
#define DEVICE_ID "RETRO_LAUNCHER"
#define SERIAL_TIMEOUT 10000
#define NFC_SCAN_TIMEOUT 15000
#define MAX_RETRY_ATTEMPTS 3
#define BLOCKS_TO_READ 16  // Read more blocks for better NDEF parsing
#define BLOCKS_TO_WRITE 16  // Maximum blocks to write
#define MAX_DATA_LENGTH 256  // Maximum data length for writing

// Global variables
MFRC522 rfid(SS_PIN, RST_PIN);
String lastNFCData = "";
String lastUID = "";
unsigned long lastScanTime = 0;
bool hasValidLastScan = false;

void setup() {
  Serial.begin(115200);
  
  // Wait for serial connection with timeout
  unsigned long startTime = millis();
  while (!Serial && (millis() - startTime < 5000)) {
    delay(10);
  }
  
  Serial.println("Starting RFID initialization...");
  Serial.println("SS_PIN: " + String(SS_PIN));
  Serial.println("RST_PIN: " + String(RST_PIN));
  
  // Initialize SPI with explicit configuration
  SPI.begin();
  Serial.println("SPI initialized");
  
  // Initialize RFID with delay
  delay(100);
  rfid.PCD_Init();
  delay(100);
  Serial.println("RFID PCD_Init completed");
  
  // Check if the module is properly connected
  byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
  Serial.println("MFRC522 Version: 0x" + String(version, HEX));
  
  if (version == 0x00 || version == 0xFF) {
    Serial.println("ERROR: RFID module not detected - check wiring!");
    Serial.println("Expected version: 0x91 or 0x92");
    Serial.println("Continuing without self-test...");
  } else {
    Serial.println("RFID module detected successfully");
    
    // Perform self-test with better error reporting
    Serial.println("Performing RFID self-test...");
    if (!rfid.PCD_PerformSelfTest()) {
      Serial.println("WARNING: RFID module self-test failed");
      Serial.println("This might indicate hardware issues, but the module may still work");
      Serial.println("Common causes:");
      Serial.println("- Loose connections");
      Serial.println("- Insufficient power supply");
      Serial.println("- Defective module");
    } else {
      Serial.println("RFID self-test passed!");
    }
    
    // Re-initialize after self-test
    rfid.PCD_Init();
    delay(100);
  }
  
  Serial.println("Commands: WHO_ARE_YOU, GET_LAST_NFC, WRITE_NFC:<data>");
}

void loop() {
  // Handle serial commands
  handleSerialCommands();
  
  // Continuous NFC scanning when idle
  performContinuousNFCScan();
  
  delay(50); // Small delay to prevent overwhelming the serial
}

/**
 * Handle incoming serial commands
 */
void handleSerialCommands() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command.length() == 0) return;
    
    // Device identification
    if (command == "WHO_ARE_YOU") {
      Serial.println(DEVICE_ID);
    }
    // Get last scanned NFC data
    else if (command == "GET_LAST_NFC") {
      sendLastNFCData();
    }
    // Write data to NFC card
    else if (command.startsWith("WRITE_NFC:")) {
      String dataToWrite = command.substring(10); // Remove "WRITE_NFC:" prefix
      writeNFCCard(dataToWrite);
    }
    else {
      Serial.println("ERROR: Unknown command: " + command);
    }
  }
}

/**
 * Continuous NFC scanning for passive detection
 */
void performContinuousNFCScan() {
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String currentUID = getCardUID();
    
    // Only process if it's a new card or significant time has passed
    if (currentUID != lastUID || (millis() - lastScanTime > 2000)) {
      String nfcData = readNFCCard();
      
      if (nfcData.length() > 0) {
        lastNFCData = nfcData;
        lastUID = currentUID;
        lastScanTime = millis();
        hasValidLastScan = true;
        
        // Notify of automatic scan
        Serial.println("AUTO_NFC_DETECTED");
        Serial.print(nfcData);
        Serial.println("AUTO_NFC_COMPLETE");
      }
    }
    
    // Halt the card
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    delay(1000); // Prevent rapid re-scanning of same card
  }
}

/**
 * Read NFC card data with improved error handling
 */
String readNFCCard() {
  String result = "";

  try {
    String uid = getCardUID();
    result += "UID:" + uid + "\n";

    byte buffer[18];
    byte size = sizeof(buffer);

    for (byte block = 4; block < min(BLOCKS_TO_READ, 64); block++) {
      bool blockRead = false;

      for (int attempt = 0; attempt < MAX_RETRY_ATTEMPTS && !blockRead; attempt++) {
        MFRC522::StatusCode status = rfid.MIFARE_Read(block, buffer, &size);

        if (status == MFRC522::STATUS_OK) {
          result += "Block " + String(block) + ":";
          for (byte i = 0; i < 16; i++) {
            if (buffer[i] < 0x10) result += " 0";
            else result += " ";
            result += String(buffer[i], HEX);
          }
          result += "\n";
          blockRead = true;
        } else if (attempt == MAX_RETRY_ATTEMPTS - 1) {
          // Only log error on final attempt to avoid spam
          result += "Block " + String(block) + ": ERROR " + String(rfid.GetStatusCodeName(status)) + "\n";
        }

        if (!blockRead) delay(10); // Brief delay before retry
      }
    }

  } catch (...) {
    Serial.println("ERROR: Exception occurred while reading NFC card");
    return "";
  }

  return result;
}

/**
 * Get formatted UID string
 */
String getCardUID() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

/**
 * Send last scanned NFC data
 */
void sendLastNFCData() {
  if (hasValidLastScan && lastNFCData.length() > 0) {
    Serial.println("LAST_NFC_DATA_START");
    Serial.print(lastNFCData);
    Serial.println("LAST_NFC_DATA_END");
  } else {
    Serial.println("ERROR: No previous NFC scan data available");
  }
}

/**
 * Write data to NFC card
 */
void writeNFCCard(String data) {
  Serial.println("WRITE_NFC_START");
  
  // Wait for a card to be present with timeout
  unsigned long startTime = millis();
  bool cardDetected = false;
  
  Serial.println("Waiting for NFC card to write...");
  
  while (millis() - startTime < NFC_SCAN_TIMEOUT) {
    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
      cardDetected = true;
      break;
    }
    delay(100);
  }
  
  if (!cardDetected) {
    Serial.println("ERROR: No NFC card detected within timeout");
    Serial.println("WRITE_NFC_COMPLETE");
    return;
  }
  
  // Get card UID for confirmation
  String uid = getCardUID();
  Serial.println("Writing to card UID: " + uid);
  
  // Authenticate and write data
  bool writeSuccess = writeDataToCard(data);
  
  if (writeSuccess) {
    Serial.println("SUCCESS: Data written to NFC card");
  } else {
    Serial.println("ERROR: Failed to write data to NFC card");
  }
  
  // Halt the card
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  
  Serial.println("WRITE_NFC_COMPLETE");
}

/**
 * Write data to NFC card blocks
 */
bool writeDataToCard(String data) {
  // Limit data length
  if (data.length() > MAX_DATA_LENGTH) {
    Serial.println("WARNING: Data truncated to " + String(MAX_DATA_LENGTH) + " characters");
    data = data.substring(0, MAX_DATA_LENGTH);
  }
  
  // Convert string to bytes
  byte dataBytes[MAX_DATA_LENGTH + 1];
  data.getBytes(dataBytes, data.length() + 1);
  
  // Calculate how many blocks we need (16 bytes per block)
  int blocksNeeded = (data.length() + 15) / 16;
  if (blocksNeeded > BLOCKS_TO_WRITE) {
    blocksNeeded = BLOCKS_TO_WRITE;
  }
  
  Serial.println("Writing " + String(data.length()) + " bytes across " + String(blocksNeeded) + " blocks");
  
  // Try to authenticate with default keys
  MFRC522::MIFARE_Key key;
  for (byte i = 0; i < 6; i++) key.keyByte[i] = 0xFF; // Default key
  
  bool allBlocksWritten = true;
  
  // Write data starting from block 4 (blocks 0-3 are usually reserved)
  for (int block = 4; block < 4 + blocksNeeded; block++) {
    // Authenticate for each block
    byte trailerBlock = ((block / 4) * 4) + 3; // Calculate trailer block
    
    for (int attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      MFRC522::StatusCode status = rfid.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, trailerBlock, &key, &(rfid.uid));
      
      if (status == MFRC522::STATUS_OK) {
        break;
      } else if (attempt == MAX_RETRY_ATTEMPTS - 1) {
        Serial.println("ERROR: Authentication failed for block " + String(block));
        allBlocksWritten = false;
        continue;
      }
      delay(10);
    }
    
    // Prepare data for this block
    byte blockData[16];
    memset(blockData, 0, 16); // Initialize with zeros
    
    int dataStartIndex = (block - 4) * 16;
    int bytesToCopy = min(16, (int)data.length() - dataStartIndex);
    
    if (bytesToCopy > 0) {
      memcpy(blockData, dataBytes + dataStartIndex, bytesToCopy);
    }
    
    // Write the block
    bool blockWritten = false;
    for (int attempt = 0; attempt < MAX_RETRY_ATTEMPTS && !blockWritten; attempt++) {
      MFRC522::StatusCode status = rfid.MIFARE_Write(block, blockData, 16);
      
      if (status == MFRC522::STATUS_OK) {
        Serial.println("Block " + String(block) + " written successfully");
        blockWritten = true;
      } else {
        if (attempt == MAX_RETRY_ATTEMPTS - 1) {
          Serial.println("ERROR: Failed to write block " + String(block) + " - " + String(rfid.GetStatusCodeName(status)));
          allBlocksWritten = false;
        } else {
          delay(10);
        }
      }
    }
  }
  
  return allBlocksWritten;
}
