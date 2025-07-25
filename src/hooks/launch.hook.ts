import { useEffect, useState } from "react";

import { useLogsContext } from "@/contexts/logs-context";
import { useCartridge } from "@/hooks/cartridge.hook";

export interface Launch {
  isLaunching: boolean;
  launchCartridge: () => Promise<void>;
}

export function useLauncher(): Launch {
  const { lastCartridge } = useCartridge();
  const { addLogs } = useLogsContext();

  const [isLaunching, setIsLaunching] = useState<boolean>(false);

  useEffect(() => {
    window.launcherAPI.onApplicationLaunched(() => {
      setIsLaunching(false);
    });

    window.launcherAPI.onApplicationLaunchError((data) => {
      addLogs(`Launch error for ${data.pathName}: ${data.error}`);
      setIsLaunching(false);
    });

    return () => {
      window.launcherAPI.removeAllListeners("application-launched");
      window.launcherAPI.removeAllListeners("application-launch-error");
    };
  }, []);

  const launchCartridge = async () => {
    if (!lastCartridge) {
      addLogs("No cartridge to launch");
      return;
    }

    try {
      setIsLaunching(true);
      await window.launcherAPI.launchCartridge(lastCartridge.pathName);
    } catch (error) {
      setIsLaunching(false);
      addLogs(`Failed to launch cartridge: ${error}`);
      throw error;
    }
  };

  return { launchCartridge, isLaunching };
}
