export const SERIAL_CONFIG = {
  BAUD_RATE: 115200,
  MAX_RETRIES: 3,
  RETRY_INTERVAL_MS: 5000, // 5 seconds
} as const;

export const ESP32_IDENTIFIERS = {
  MANUFACTURERS: ['espressif', 'silicon labs'],
  PRODUCT_ID: '7523', // Common ESP32 product ID
  VENDOR_ID: '10c4', // Common ESP32 vendor ID
} as const;

export const SERIAL_COMMANDS = {
  TAG_REMOVED: 'TAG_REMOVED',
} as const;

export const ERROR_MESSAGES = {
  SERIALPORT_NOT_AVAILABLE:
    'SerialPort not available. Please install serialport dependencies.',
  ESP32_NOT_FOUND:
    'ESP32 not found after multiple attempts. Please check connection.',
  ESP32_DISCONNECTED: 'ESP32 disconnected',
  ESP32_CONNECTED: 'ESP32 connected successfully',
  INVALID_TAG_DATA: 'Invalid tag data structure',
  FILE_NOT_FOUND: 'File not found',
  CONNECTION_FAILED: 'Connection failed',
} as const;
