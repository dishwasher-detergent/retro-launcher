import { useLogsContext } from "@/contexts/logs-context";
import { DeviceInfo } from "@/types/electron";
import { useEffect, useState } from "react";

export interface Status {
  selectedDevice: DeviceInfo | null;
  isLoading: boolean;
}

export function useStatus(): Status {
  const { addLogs } = useLogsContext();
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeDeviceStatus = async () => {
      if (window.deviceApi) {
        try {
          const selectedDevice = await window.deviceApi.getSelectedDevice();
          setSelectedDevice(selectedDevice);
        } catch (error) {
          console.error("Failed to get selected device:", error);
          addLogs(`Error getting selected device: ${error}`);
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeDeviceStatus();

    if (window.deviceApi) {
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

  return {
    selectedDevice,
    isLoading,
  };
}
