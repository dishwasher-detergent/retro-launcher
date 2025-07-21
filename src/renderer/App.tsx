import { useEffect, useState } from 'react';
import { Route, MemoryRouter as Router, Routes } from 'react-router-dom';
import './App.css';

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
    <div>
      <h1>Retro Launcher</h1>
      <div className="nfc-status">
        <h3>NFC Reader Status</h3>
        <div
          style={{
            padding: '10px',
            borderRadius: '5px',
            backgroundColor: connectionStatus.connected ? '#4CAF50' : '#f44336',
            color: 'white',
            marginBottom: '20px',
          }}
        >
          {connectionStatus.connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>

        {connectionStatus.message && (
          <div
            style={{
              padding: '10px',
              borderRadius: '5px',
              backgroundColor: '#f0f0f0',
              color: '#333',
              marginBottom: '20px',
              fontSize: '14px',
            }}
          >
            <strong>Status:</strong> {connectionStatus.message}
          </div>
        )}

        {connectionStatus.connected && (
          <div>
            <h3>Current Tag</h3>
            {currentTag ? (
              <div
                style={{
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  backgroundColor: '#f9f9f9',
                }}
              >
                <p>
                  <strong>Description:</strong> {currentTag.description}
                </p>
                <p>
                  <strong>File Path:</strong> {currentTag.filePath}
                </p>
                <p>
                  <strong>Icon:</strong> {currentTag.icon}
                </p>
              </div>
            ) : (
              <div
                style={{
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  backgroundColor: '#f0f0f0',
                  color: '#666',
                }}
              >
                No tag detected - Place an NFC tag on the reader
              </div>
            )}
          </div>
        )}

        {!connectionStatus.connected && (
          <div
            style={{
              padding: '15px',
              border: '1px solid #orange',
              borderRadius: '5px',
              backgroundColor: '#fff3cd',
              color: '#856404',
              marginTop: '20px',
            }}
          >
            <h4>📡 ESP32 Setup Instructions:</h4>
            <ol style={{ textAlign: 'left', margin: 0 }}>
              <li>Connect your ESP32 to your computer via USB</li>
              <li>
                Upload the RFID reader sketch from the <code>esp32/</code>{' '}
                folder
              </li>
              <li>Make sure the RC522 RFID reader is properly wired</li>
              <li>
                The app will automatically detect the ESP32 when connected
              </li>
            </ol>
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
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
