import { useStatus } from "@/hooks/status.hook";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function StatusIndicator() {
  const { selectedDevice } = useStatus();

  return (
    <div className="no-drag h-full flex items-center">
      {selectedDevice ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-row gap-1 items-center no-drag">
              <div className="size-2 rounded-full animate-pulse bg-emerald-600" />
              <p className="font-semibold text-xs text-foreground">Connected</p>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Product: {selectedDevice.productId}</p>
            <p>Serial Number: {selectedDevice.serialNumber}</p>
            <p>Manufacturer: {selectedDevice.manufacturer}</p>
            <p>Vendor ID: {selectedDevice.vendorId}</p>
            <p>Path: {selectedDevice.path}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <div className="flex flex-row gap-1 items-center no-drag">
          <div className="size-2 rounded-full animate-pulse bg-destructive" />
          <p className="font-semibold text-xs text-foreground">Disconnected</p>
        </div>
      )}
    </div>
  );
}
