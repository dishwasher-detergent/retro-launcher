import { useEffect, useState } from 'react';
import { Route, MemoryRouter as Router, Routes } from 'react-router-dom';
import './global.css';

interface NFCConnectionStatus {
  connected: boolean;
  message?: string;
}

interface NFCTagData {
  filePath: string;
  description: string;
  icon: string;
}

function NFCStatus() {
  const [connectionStatus, setConnectionStatus] = useState<NFCConnectionStatus>(
    {
      connected: false,
      message: 'Initializing...',
    },
  );
  const [currentTag, setCurrentTag] = useState<NFCTagData | null>(null);

  useEffect(() => {
    window.electron.nfc.getStatus().then(setConnectionStatus);
    const removeStatusListener =
      window.electron.nfc.onStatusChanged(setConnectionStatus);
    const removeTagListener = window.electron.nfc.onTagDetected(
      (tagData: NFCTagData) => {
        setCurrentTag(tagData);
      },
    );

    const removeTagRemovedListener = window.electron.nfc.onTagRemoved(() => {
      setCurrentTag(null);
    });

    return () => {
      removeStatusListener();
      removeTagListener();
      removeTagRemovedListener();
    };
  }, []);

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6">Retro Launcher</h1>
      <div className="nfc-status">
        <h3 className="text-xl font-semibold mb-4">NFC Reader Status</h3>
        <div
          className={`p-4 rounded-lg text-white mb-5 text-center font-medium ${
            connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {connectionStatus.connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>

        {connectionStatus.message && (
          <div className="p-4 rounded-lg bg-gray-100 text-gray-800 mb-5 text-sm">
            <strong>Status:</strong> {connectionStatus.message}
          </div>
        )}

        {connectionStatus.connected && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Current Tag</h3>
            {currentTag ? (
              <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                <p className="mb-2">
                  <strong>Description:</strong> {currentTag.description}
                </p>
                <p className="mb-2">
                  <strong>File Path:</strong> {currentTag.filePath}
                </p>
                <p>
                  <strong>Icon:</strong> {currentTag.icon}
                </p>
              </div>
            ) : (
              <div className="p-4 border border-gray-300 rounded-lg bg-gray-100 text-gray-600">
                No tag detected - Place an NFC tag on the reader
              </div>
            )}
          </div>
        )}

        {!connectionStatus.connected && (
          <div className="p-6 border border-orange-400 rounded-lg bg-yellow-50 text-yellow-800 mt-5">
            <h4 className="text-lg font-semibold mb-3">
              📡 ESP32 Setup Instructions:
            </h4>
            <ol className="text-left space-y-2 m-0 list-decimal list-inside">
              <li>Connect your ESP32 to your computer via USB</li>
              <li>
                Upload the RFID reader sketch from the{' '}
                <code className="bg-gray-200 px-1 rounded">esp32/</code> folder
              </li>
              <li>Make sure the RC522 RFID reader is properly wired</li>
              <li>
                The app will automatically detect the ESP32 when connected
              </li>
            </ol>
          </div>
        )}
      </div>

      <div className="mt-5 text-xs text-gray-500 text-center">
        This app runs in the system tray. Check your system tray for the app
        icon.
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<NFCStatus />} />
      </Routes>
    </Router>
  );
}
