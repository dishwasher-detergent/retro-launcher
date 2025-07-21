import { Minus, Square, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check initial maximized state
    if (window.windowAPI) {
      window.windowAPI.isMaximized().then(setIsMaximized);
    }
  }, []);

  const handleMinimize = async () => {
    if (window.windowAPI) {
      await window.windowAPI.minimize();
    }
  };

  const handleMaximize = async () => {
    if (window.windowAPI) {
      await window.windowAPI.maximize();
      // Update the maximized state
      const maximized = await window.windowAPI.isMaximized();
      setIsMaximized(maximized);
    }
  };

  const handleClose = async () => {
    if (window.windowAPI) {
      await window.windowAPI.close();
    }
  };

  return (
    <div className="flex items-center space-x-1 no-drag">
      <Button
        variant="ghost"
        size="icon"
        className="size-6 p-0 hover:bg-muted rounded-sm"
        onClick={handleMinimize}
        title="Minimize"
      >
        <Minus className="size-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-6 p-0 hover:bg-muted rounded-sm"
        onClick={handleMaximize}
        title={isMaximized ? "Restore" : "Maximize"}
      >
        <Square className="size-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-6 p-0 hover:bg-destructive hover:text-destructive-foreground rounded-sm"
        onClick={handleClose}
        title="Close"
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}
