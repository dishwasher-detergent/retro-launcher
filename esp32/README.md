# Retro Launcher v2 - ESP32 Integration

This folder contains Arduino code for the ESP32 that interfaces with the Retro Launcher application.

## Hardware Requirements

- ESP32 development board
- MFRC522 RFID/NFC reader module
- NFC cards or tags
- Connecting wires

## Wiring

Connect the MFRC522 to your ESP32 as follows:

| MFRC522 | ESP32   |
| ------- | ------- |
| VCC     | 3.3V    |
| GND     | GND     |
| RST     | GPIO 22 |
| SDA     | GPIO 21 |
| MOSI    | GPIO 23 |
| MISO    | GPIO 19 |
| SCK     | GPIO 18 |

## Setup

1. Install the Arduino IDE
2. Install the ESP32 board package
3. Install the MFRC522 library: `Sketch -> Include Library -> Manage Libraries` and search for "MFRC522"
4. Install the ArduinoJson library for JSON handling
5. Upload the provided sketch to your ESP32
6. Program your NFC cards with the required JSON data

## NFC Card Format

Each NFC card should contain JSON data in this format:

```json
{
  "name": "Game Name",
  "icon": "path/to/icon.png",
  "pathName": "C:\\Path\\To\\Application.exe"
}
```

Example:

```json
{
  "name": "Retro Game",
  "icon": "icons/game.png",
  "pathName": "C:\\Games\\RetroGame\\game.exe"
}
```

## Programming NFC Cards

You can use smartphone apps like "NFC Tools" to write the JSON data to your NFC cards.

## Troubleshooting

- Make sure the ESP32 is connected to the same USB port
- Check the serial monitor (115200 baud) for debug information
- Verify the MFRC522 wiring connections
- Ensure NFC cards are properly formatted with valid JSON
