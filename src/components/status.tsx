import { useStatus } from "@/hooks/status.hook";
import { LucideRefreshCw } from "lucide-react";
import { Button } from "./ui/button";

export function StatusIndicator() {
  const { selectedDevice, handleTestDevice } = useStatus();

  return (
    <div className="no-drag h-full flex items-center">
      {selectedDevice ? (
        <div className="flex flex-row gap-1 items-center no-drag">
          <div className="size-2 rounded-full animate-pulse bg-emerald-600" />
          <p className="font-semibold text-xs text-foreground">Connected</p>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => handleTestDevice}
          title="Reconnect"
          className="h-6 text-xs"
        >
          <div className="size-2 rounded-full animate-pulse bg-destructive" />
          Disconnected
          <LucideRefreshCw className="size-3" />
        </Button>
      )}
    </div>
  );
}
