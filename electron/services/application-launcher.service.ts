import { exec } from "child_process";
import { EventEmitter } from "events";

export class ApplicationLauncherService extends EventEmitter {
  constructor() {
    super();
  }

  public launchApplication(pathName: string): void {
    console.log(`Launching application: ${pathName}`);

    exec(pathName, (error) => {
      if (error) {
        console.error(`Failed to launch application: ${error.message}`);
        this.emit("launchError", { pathName, error: error.message });
      } else {
        console.log(`Successfully launched: ${pathName}`);
        this.emit("applicationLaunched", { pathName });
      }
    });
  }
}
