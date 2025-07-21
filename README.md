# Retro Launcher

A desktop application that uses NFC tags to launch files and applications. Built with Electron, React, and TypeScript, it communicates with an ESP32 and RC522 RFID reader to detect NFC tags containing JSON data with file paths, descriptions, and icons.

## Features

- **System Tray Integration**: Runs minimized in the system tray with status indicators
- **NFC Tag Detection**: Automatically detects when NFC tags are placed on or removed from the reader
- **File Launching**: Opens files, applications, or directories based on NFC tag data
- **Real-time Status**: Visual indicators showing ESP32 connection status and current tag information
- **Cross-platform**: Works on Windows, macOS, and Linux

## System Requirements

### Software
- Node.js 16+ and npm
- Arduino IDE (for ESP32 programming)

### Hardware
- ESP32 development board
- RC522 RFID reader module
- NFC tags (NTAG213/215/216 compatible)
- Jumper wires for connections

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd retro-launcher
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up the ESP32** (see [ESP32 Setup](#esp32-setup) below)

## Usage

1. **Start the application**:
   ```bash
   npm start
   ```

2. **The app will run in the system tray**. Look for the Retro Launcher icon in your system tray.

3. **Connect your ESP32** with the programmed sketch via USB.

4. **Place an NFC tag** on the RC522 reader to launch the associated file.

## ESP32 Setup

### Wiring

Connect the RC522 module to the ESP32:

| RC522 Pin | ESP32 Pin |
|-----------|-----------|
| SDA/SS    | GPIO 21   |
| SCK       | GPIO 18   |
| MOSI      | GPIO 23   |
| MISO      | GPIO 19   |
| GND       | GND       |
| RST       | GPIO 22   |
| 3.3V      | 3.3V      |

### Arduino Libraries

Install these libraries in Arduino IDE:
1. **MFRC522** by GithubCommunity
2. **ArduinoJson** by Benoit Blanchon

### Programming the ESP32

1. Open `esp32/rfid_reader/rfid_reader.ino` in Arduino IDE
2. Select your ESP32 board and port
3. Upload the sketch

## NFC Tag Programming

### JSON Format

Each NFC tag should contain JSON data in this format:

```json
{
  "filePath": "C:\\Users\\User\\Documents\\game.exe",
  "description": "Retro Game Launcher", 
  "icon": "game.ico"
}
```

### Programming Tags

1. Use the tag programmer sketch: `esp32/tag_programmer/tag_programmer.ino`
2. Upload to ESP32 and open Serial Monitor
3. Place an NFC tag on the reader
4. Send JSON data via Serial Monitor to program the tag

### Mobile Programming

You can also use NFC programming apps on Android/iOS to write NDEF records containing the JSON data.

## Building for Production

```bash
# Build the application
npm run build

# Package for distribution
npm run package
```

## System Tray Features

- **Green indicator**: ESP32 connected and ready
- **Red indicator**: ESP32 disconnected
- **Current tag display**: Shows information about the currently detected tag
- **Right-click menu**: Access app settings and quit option

## File Types Supported

The application can launch:
- Executable files (.exe, .app, etc.)
- Documents (opens with default application)
- Directories (opens in file explorer)
- URLs (opens in default browser)

## Troubleshooting

### ESP32 Connection Issues
- Check COM port in Device Manager (Windows)
- Verify ESP32 drivers are installed
- Ensure correct baud rate (115200)

### NFC Tag Issues
- Use NTAG213/215/216 compatible tags
- Ensure tags are properly programmed with JSON data
- Check JSON format is valid

### File Launch Issues
- Verify file paths in JSON are correct and accessible
- Check file permissions
- Ensure applications are installed and executable

## Development

### Project Structure

```
src/
├── main/                 # Electron main process
│   ├── main.ts          # Main entry point
│   ├── nfc-service.ts   # ESP32 communication
│   └── system-tray.ts   # System tray management
├── renderer/            # React renderer process
│   ├── App.tsx          # Main React component
│   └── index.tsx        # Renderer entry point
└── __tests__/           # Test files

esp32/
├── rfid_reader/         # Main RFID reader sketch
└── tag_programmer/      # NFC tag programming utility
```

### Available Scripts

```bash
npm start          # Start development server
npm run build      # Build for production
npm run package    # Create distributable package
npm run lint       # Run ESLint
npm test          # Run tests
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built on [Electron React Boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate)
- Uses [MFRC522 library](https://github.com/miguelbalboa/rfid) for ESP32 RFID communication
- Inspired by retro gaming and physical computing projects
