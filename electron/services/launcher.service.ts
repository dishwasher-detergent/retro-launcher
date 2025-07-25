import { execFile, ExecFileException } from "child_process";
import { EventEmitter } from "events";

export class LauncherService extends EventEmitter {
  constructor() {
    super();
  }

  public launchApplication(pathName: string): void {
    console.log(`Launching application: ${pathName}`);

    const child = execFile(
      pathName,
      { windowsHide: false },
      (error: ExecFileException | null) => {
        if (error) {
          console.error(`Failed to launch application: ${error.message}`);
          this.emit("launchError", error.message);
          return;
        }
      }
    );

    child.on("spawn", () => {
      console.log(`Successfully launched: ${pathName}`);
      this.emit("applicationLaunched");
    });

    child.on("error", (error: Error) => {
      console.error(`Failed to launch application: ${error.message}`);
      this.emit("launchError", error.message);
    });

    child.unref();
  }
}
