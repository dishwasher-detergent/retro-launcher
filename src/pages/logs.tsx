import { Button } from "@/components/ui/button";
import { LucideBrushCleaning } from "lucide-react";
import { useLogsContext } from "../contexts/logs-context";

export function LogsPage() {
  const { notifications, clearLogs } = useLogsContext();

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
        {notifications.map((notification, index) => (
          <p
            key={index}
            className="text-sm text-muted-foreground font-mono mb-1"
          >
            {notification}
          </p>
        ))}
        {notifications.length === 0 && (
          <p className="text-sm text-muted-foreground text-center">
            No log entries yet. Interact with the NFC reader to see system
            events.
          </p>
        )}
      </div>
    </>
  );
}
