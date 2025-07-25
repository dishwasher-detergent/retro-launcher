import { LucideBrushCleaning } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLogsContext } from "@/contexts/logs-context";
import { useStatus } from "@/hooks/status.hook";

export function LogsPage() {
  const { selectedDevice } = useStatus();
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
      {selectedDevice ? (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">Connected Device</h2>
          <p>Product: {selectedDevice.productId}</p>
          <p>Serial Number: {selectedDevice.serialNumber}</p>
          <p>Manufacturer: {selectedDevice.manufacturer}</p>
          <p>Vendor ID: {selectedDevice.vendorId}</p>
          <p>Path: {selectedDevice.path}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mt-2">
          No devices connected.
        </p>
      )}
    </>
  );
}
