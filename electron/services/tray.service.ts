import { Menu, Tray, nativeImage } from "electron";
import path from "node:path";

import {
  TRAY_ICON_PATH,
  TRAY_MENU_LABELS,
  TRAY_TOOLTIP,
} from "../constants/tray.constant";
import { TrayMenuOptions } from "../interfaces/tray-menu-options.interface";

export class TrayService {
  private tray: Tray | null = null;
  private menuOptions: TrayMenuOptions;

  constructor(menuOptions: TrayMenuOptions) {
    this.menuOptions = menuOptions;
  }

  /**
   * Initialize system tray
   */
  public initializeTray(iconBasePath: string): void {
    const iconPath = path.join(iconBasePath, TRAY_ICON_PATH);

    // Create tray icon
    let trayIcon: Electron.NativeImage;
    try {
      trayIcon = nativeImage.createFromPath(iconPath);
      if (trayIcon.isEmpty()) {
        // Fallback to a simple icon if file doesn't exist
        trayIcon = nativeImage.createEmpty();
      }
    } catch (error) {
      console.error("Failed to load tray icon:", error);
      trayIcon = nativeImage.createEmpty();
    }

    this.tray = new Tray(trayIcon);
    this.tray.setToolTip(TRAY_TOOLTIP);

    // Set up double-click handler to show window
    this.tray.on("double-click", () => {
      this.menuOptions.navigateToHome();
    });

    this.updateTrayMenu();
  }

  /**
   * Update tray context menu
   */
  private updateTrayMenu(): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Navigate to...",
        submenu: [
          {
            label: TRAY_MENU_LABELS.HOME,
            click: () => this.menuOptions.navigateToHome(),
          },
          {
            label: TRAY_MENU_LABELS.WRITER,
            click: () => this.menuOptions.navigateToWriter(),
          },
          {
            label: TRAY_MENU_LABELS.LOGS,
            click: () => this.menuOptions.navigateToLogs(),
          },
        ],
      },
      { type: "separator" },
      {
        label: TRAY_MENU_LABELS.QUIT,
        click: () => this.menuOptions.quitApp(),
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Show notification balloon
   */
  public showNotification(title: string, content: string): void {
    if (!this.tray) return;

    this.tray.displayBalloon({
      title,
      content,
      iconType: "info",
    });
  }

  /**
   * Cleanup tray
   */
  public cleanup(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  /**
   * Get tray instance
   */
  public getTray(): Tray | null {
    return this.tray;
  }
}
