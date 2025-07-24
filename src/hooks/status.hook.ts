import { useEffect, useState } from "react";
import { DeviceInfo } from "../types/electron";

export interface Status {
  selectedDevice: DeviceInfo | null;
  isLoading: boolean;
  testingDevice: string | null;
  handleTestDevice: (devicePath: string) => Promise<void>;
}

export function useStatus(): Status {
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testingDevice, setTestingDevice] = useState<string | null>(null);

  useEffect(() => {
    const initializeDeviceStatus = async () => {
      if (window.deviceApi) {
        try {
          const selectedDevice = await window.deviceApi.getSelectedDevice();
          setSelectedDevice(selectedDevice);
        } catch (error) {
          console.error("Failed to get selected device:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeDeviceStatus();

    if (window.deviceApi) {
      // Set up event listener for selected device changes
      window.deviceApi.onSelectedDeviceChanged((device: DeviceInfo | null) => {
        setSelectedDevice(device);
      });
    }

    return () => {
      if (window.deviceApi) {
        window.deviceApi.removeAllListeners("selected-device-changed");
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

  return {
    selectedDevice,
    isLoading,
    testingDevice,
    handleTestDevice,
  };
}
