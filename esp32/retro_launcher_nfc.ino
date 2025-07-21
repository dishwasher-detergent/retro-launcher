#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

// Pin definitions for ESP32
#define SS_PIN 21    // SDA pin
#define RST_PIN 22   // Reset pin

MFRC522 mfrc522(SS_PIN, RST_PIN);

// Variables for NFC card handling
String lastCardUID = "";
unsigned long lastCardTime = 0;
const unsigned long CARD_DEBOUNCE_TIME = 2000; // 2 seconds

void setup() {
  Serial.begin(115200);
  
  // Initialize SPI bus
  SPI.begin();
  
  // Initialize MFRC522
  mfrc522.PCD_Init();
  
  // Show details of PCD - MFRC522 Card Reader details
  mfrc522.PCD_DumpVersionToSerial();
  
  Serial.println("ESP32 NFC Reader for Retro Launcher v2");
  Serial.println("Ready to read NFC cards...");
}

void loop() {
  // Reset the loop if no new card present on the sensor/reader
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  // Select one of the cards
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Get card UID
  String cardUID = getCardUID();
  
  // Check if this is the same card read recently (debounce)
  unsigned long currentTime = millis();
  if (cardUID == lastCardUID && (currentTime - lastCardTime) < CARD_DEBOUNCE_TIME) {
    mfrc522.PICC_HaltA();
    return;
  }
  
  lastCardUID = cardUID;
  lastCardTime = currentTime;
  
  Serial.println("NFC Card detected!");
  Serial.print("UID: ");
  Serial.println(cardUID);
  
  // Read data from the card
  String cardData = readCardData();
  
  if (cardData.length() > 0) {
    Serial.println("Card data:");
    Serial.println(cardData);
    
    // Try to parse and validate JSON
    if (validateAndProcessCardData(cardData)) {
      Serial.println("Valid card data sent to Retro Launcher");
    } else {
      Serial.println("Invalid card data format");
    }
  } else {
    Serial.println("No data found on card");
  }
  
  // Halt PICC
  mfrc522.PICC_HaltA();
  
  // Stop encryption on PCD
  mfrc522.PCD_StopCrypto1();
  
  Serial.println("---");
}

String getCardUID() {
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

String readCardData() {
  String data = "";
  
  // Try to read from sector 1, block 4 (first data block)
  // This is a simple example - you may need to adapt based on your card type
  
  MFRC522::MIFARE_Key key;
  for (byte i = 0; i < 6; i++) {
    key.keyByte[i] = 0xFF; // Default key
  }
  
  byte sector = 1;
  byte blockAddr = 4;
  byte trailerBlock = 7;
  MFRC522::StatusCode status;
  
  // Authenticate using key A
  status = mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, trailerBlock, &key, &(mfrc522.uid));
  if (status != MFRC522::STATUS_OK) {
    Serial.print("PCD_Authenticate() failed: ");
    Serial.println(mfrc522.GetStatusCodeName(status));
    return "";
  }
  
  // Read data from the block
  byte buffer[18];
  byte size = sizeof(buffer);
  status = mfrc522.MIFARE_Read(blockAddr, buffer, &size);
  
  if (status == MFRC522::STATUS_OK) {
    // Convert buffer to string
    for (int i = 0; i < 16; i++) {
      if (buffer[i] != 0) {
        data += (char)buffer[i];
      }
    }
    
    // Try to read additional blocks if data seems to continue
    for (int block = blockAddr + 1; block < trailerBlock && data.length() < 200; block++) {
      byte extraBuffer[18];
      byte extraSize = sizeof(extraBuffer);
      status = mfrc522.MIFARE_Read(block, extraBuffer, &extraSize);
      
      if (status == MFRC522::STATUS_OK) {
        for (int i = 0; i < 16; i++) {
          if (extraBuffer[i] != 0) {
            data += (char)extraBuffer[i];
          }
        }
      }
    }
  } else {
    Serial.print("MIFARE_Read() failed: ");
    Serial.println(mfrc522.GetStatusCodeName(status));
  }
  
  return data;
}

bool validateAndProcessCardData(String jsonData) {
  // Create JSON document
  DynamicJsonDocument doc(1024);
  
  // Parse JSON
  DeserializationError error = deserializeJson(doc, jsonData);
  
  if (error) {
    Serial.print("JSON parsing failed: ");
    Serial.println(error.c_str());
    return false;
  }
  
  // Check required fields
  if (!doc.containsKey("name") || !doc.containsKey("pathName")) {
    Serial.println("Missing required fields: name and pathName");
    return false;
  }
  
  // Extract values
  String name = doc["name"];
  String pathName = doc["pathName"];
  String icon = doc["icon"] | ""; // Default to empty string if not present
  
  // Validate that fields are not empty
  if (name.length() == 0 || pathName.length() == 0) {
    Serial.println("Name and pathName cannot be empty");
    return false;
  }
  
  // Create clean JSON output for the Retro Launcher
  DynamicJsonDocument outputDoc(512);
  outputDoc["name"] = name;
  outputDoc["icon"] = icon;
  outputDoc["pathName"] = pathName;
  
  // Send JSON to Retro Launcher via serial
  String output;
  serializeJson(outputDoc, output);
  Serial.println(output);
  
  return true;
}

// Function to handle commands from Retro Launcher (if needed)
void handleSerialCommands() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "status") {
      Serial.println("{\"status\":\"ready\",\"reader\":\"connected\"}");
    } else if (command == "version") {
      Serial.println("{\"version\":\"1.0\",\"device\":\"ESP32-RFID\"}");
    } else {
      Serial.println("{\"error\":\"unknown command\"}");
    }
  }
}
