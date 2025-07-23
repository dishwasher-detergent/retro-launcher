import { Button } from "@/components/ui/button";
import { useStatus } from "@/hooks/status.hook";
import { LucideBrushCleaning } from "lucide-react";
import { useLogsContext } from "../contexts/logs-context";

export function LogsPage() {
  const { devices } = useStatus();
  const { logs, clearLogs } = useLogsContext();

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">System Logs</h1>
          <p className="text-sm text-muted-foreground">
            System events are automatically logged here.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={clearLogs}>
          <LucideBrushCleaning />
          Clear Logs
        </Button>
      </div>
      <div className="bg-muted rounded-lg p-4 max-h-96 overflow-y-auto border">
        {logs.map((log, index) => (
          <p
            key={index}
            className="text-sm text-muted-foreground font-mono mb-1"
          >
            {log}
          </p>
        ))}
        {logs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center">
            No log entries yet. Connect or interact with devices to see system
            events.
          </p>
        )}
      </div>
      {devices.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">Connected Devices</h2>
          <ul className="list-disc pl-5 mt-2">
            {devices.map((device) => (
              <li key={device.path} className="text-sm text-muted-foreground">
                {device.path} - {device.manufacturer || "Unknown Manufacturer"}
              </li>
            ))}
          </ul>
        </div>
      )}
      {devices.length === 0 && (
        <p className="text-sm text-muted-foreground mt-2">
          No devices connected.
        </p>
      )}
    </>
  );
}
