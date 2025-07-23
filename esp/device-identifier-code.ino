void setup() {
  Serial.begin(115200);
  
  while (!Serial) {
    delay(10);
  }
  
  Serial.println("Custom Device Ready");
  Serial.println("Waiting for identification requests...");
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "WHO_ARE_YOU") {
      Serial.println("RETRO_LAUNCHER");
    }
    else if (command == "ping") {
      Serial.println("pong");
    }
    else {
      Serial.println("Unknown command: " + command);
    }
  }
  
  delay(10);
}
