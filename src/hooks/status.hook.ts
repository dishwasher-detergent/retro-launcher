import { useEffect, useState } from "react";
import { ESP32DeviceInfo } from "../types/electron";

export interface Status {
  devices: ESP32DeviceInfo[];
  isLoading: boolean;
  testingDevice: string | null;
  handleTestDevice: (devicePath: string) => Promise<void>;
  handleRefreshDevices: () => Promise<void>;
}

export function useStatus(): Status {
  const [devices, setDevices] = useState<ESP32DeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testingDevice, setTestingDevice] = useState<string | null>(null);

  useEffect(() => {
    const initializeESP32Status = async () => {
      if (window.esp32API) {
        try {
          const devices = await window.esp32API.getDevices();
          setDevices(devices);
        } catch (error) {
          console.error("Failed to get ESP32 devices:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeESP32Status();

    if (window.esp32API) {
      // Set up event listeners
      window.esp32API.onDeviceConnected((device: ESP32DeviceInfo) => {
        setDevices((prev) => {
          const exists = prev.some((d) => d.path === device.path);
          if (!exists) {
            return [...prev, device];
          }
          return prev;
        });
      });

      window.esp32API.onDeviceDisconnected((device: ESP32DeviceInfo) => {
        setDevices((prev) => prev.filter((d) => d.path !== device.path));
      });

      window.esp32API.onScanError((error: any) => {
        console.error("ESP32 scan error:", error);
      });
    }

    return () => {
      if (window.esp32API) {
        window.esp32API.removeAllListeners("esp32-device-connected");
        window.esp32API.removeAllListeners("esp32-device-disconnected");
        window.esp32API.removeAllListeners("esp32-scan-error");
      }
    };
  }, []);

  const handleTestDevice = async (devicePath: string): Promise<void> => {
    if (!window.esp32API) return;

    setTestingDevice(devicePath);
    try {
      const result = await window.esp32API.testDevice(devicePath);
      if (result.success) {
        console.log(
          `Device ${devicePath} test result:`,
          result.responsive ? "responsive" : "not responsive"
        );
      } else {
        console.error(`Device test failed:`, result.error);
      }
    } catch (error) {
      console.error("Failed to test device:", error);
    } finally {
      setTestingDevice(null);
    }
  };

  const handleRefreshDevices = async (): Promise<void> => {
    if (!window.esp32API) return;

    setIsLoading(true);
    try {
      const devices = await window.esp32API.getDevices();
      setDevices(devices);
    } catch (error) {
      console.error("Failed to refresh devices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    devices,
    isLoading,
    testingDevice,
    handleTestDevice,
    handleRefreshDevices,
  };
}
