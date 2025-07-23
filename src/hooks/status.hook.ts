import { useEffect, useState } from "react";
import { DeviceInfo } from "../types/electron";

export interface Status {
  devices: DeviceInfo[];
  isLoading: boolean;
  testingDevice: string | null;
  handleTestDevice: (devicePath: string) => Promise<void>;
  handleRefreshDevices: () => Promise<void>;
}

export function useStatus(): Status {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testingDevice, setTestingDevice] = useState<string | null>(null);

  useEffect(() => {
    const initializeDeviceStatus = async () => {
      if (window.deviceApi) {
        try {
          const devices = await window.deviceApi.getDevices();
          setDevices(devices);
        } catch (error) {
          console.error("Failed to get devices:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeDeviceStatus();

    if (window.deviceApi) {
      // Set up event listeners
      window.deviceApi.onDeviceConnected((device: DeviceInfo) => {
        setDevices((prev) => {
          const exists = prev.some((d) => d.path === device.path);
          if (!exists) {
            return [...prev, device];
          }
          return prev;
        });
      });

      window.deviceApi.onDeviceDisconnected((device: DeviceInfo) => {
        setDevices((prev) => prev.filter((d) => d.path !== device.path));
      });
    }

    return () => {
      if (window.deviceApi) {
        window.deviceApi.removeAllListeners("device-connected");
        window.deviceApi.removeAllListeners("device-disconnected");
      }
    };
  }, []);

  const handleTestDevice = async (devicePath: string): Promise<void> => {
    if (!window.deviceApi) return;

    setTestingDevice(devicePath);
    try {
      const result = await window.deviceApi.testDevice(devicePath);
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
    if (!window.deviceApi) return;

    setIsLoading(true);
    try {
      const devices = await window.deviceApi.getDevices();
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
