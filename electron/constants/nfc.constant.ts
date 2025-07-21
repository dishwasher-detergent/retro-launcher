// ESP32 Serial Communication Constants
export const ESP32_BAUD_RATE = 115200;
export const ESP32_CONNECTION_TIMEOUT = 5000;
export const ESP32_RECONNECT_INTERVAL = 3000;

// NFC Card Reading Constants
export const NFC_READ_TIMEOUT = 2000;
export const NFC_CARD_DETECTION_INTERVAL = 500;

// Serial Port Configuration
export const SERIAL_PORT_CONFIG = {
  baudRate: ESP32_BAUD_RATE,
  dataBits: 8 as const,
  stopBits: 1 as const,
  parity: "none" as const,
  autoOpen: false,
};

// Default ESP32 port patterns (Windows)
export const ESP32_PORT_PATTERNS = [
  /^COM\d+$/, // Windows COM ports
  /USB/, // USB serial devices
];
