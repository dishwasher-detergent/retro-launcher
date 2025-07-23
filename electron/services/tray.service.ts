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
  private isDeviceConnected: boolean = false;
  private connectedDeviceCount: number = 0;

  constructor(menuOptions: TrayMenuOptions) {
    this.menuOptions = menuOptions;
  }

  /**
   * Initialize system tray
   */
  public initializeTray(iconBasePath: string): void {
    const iconPath = path.join(iconBasePath, TRAY_ICON_PATH);

    let trayIcon: Electron.NativeImage;
    try {
      trayIcon = nativeImage.createFromPath(iconPath);
      if (trayIcon.isEmpty()) {
        trayIcon = nativeImage.createEmpty();
      }
    } catch (error) {
      console.error("Failed to load tray icon:", error);
      trayIcon = nativeImage.createEmpty();
    }

    this.tray = new Tray(trayIcon);
    this.updateTrayTooltip();

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

    const deviceStatusLabel = this.isDeviceConnected
      ? `🟢 Connected`
      : "❌ Disconnected";

    const contextMenu = Menu.buildFromTemplate([
      {
        label: deviceStatusLabel,
        enabled: false,
      },
      { type: "separator" },
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
   * Update tray tooltip with device status
   */
  private updateTrayTooltip(): void {
    if (!this.tray) return;

    const tooltip = this.isDeviceConnected
      ? `${TRAY_TOOLTIP} - ${this.connectedDeviceCount} device(s) connected`
      : `${TRAY_TOOLTIP} - No devices connected`;

    this.tray.setToolTip(tooltip);
  }

  /**
   * Update device connection status
   */
  public updateDeviceStatus(connectedDeviceCount: number): void {
    this.connectedDeviceCount = connectedDeviceCount;
    this.isDeviceConnected = connectedDeviceCount > 0;

    this.updateTrayTooltip();
    this.updateTrayMenu();
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
