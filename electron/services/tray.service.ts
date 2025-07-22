import { Menu, Tray, nativeImage } from "electron";
import path from "node:path";
import {
  TRAY_ICON_PATH,
  TRAY_MENU_LABELS,
  TRAY_TOOLTIP,
} from "../constants/tray.constant";
import { NFCCardData } from "../interfaces/nfc-card-data.interface";
import { TrayMenuOptions } from "../interfaces/tray-menu-options.interface";
import { NFCService } from "./nfc.service";

export class TrayService {
  private tray: Tray | null = null;
  private nfcService: NFCService;
  private menuOptions: TrayMenuOptions;
  private currentCardData: NFCCardData | null = null;
  private isNFCConnected = false;

  constructor(nfcService: NFCService, menuOptions: TrayMenuOptions) {
    this.nfcService = nfcService;
    this.menuOptions = menuOptions;
    this.setupNFCEventListeners();
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
   * Setup NFC service event listeners
   */
  private setupNFCEventListeners(): void {
    this.nfcService.on("connected", () => {
      this.isNFCConnected = true;
      this.updateTrayMenu();
    });

    this.nfcService.on("disconnected", () => {
      this.isNFCConnected = false;
      this.currentCardData = null;
      this.updateTrayMenu();
    });

    this.nfcService.on("cardDetected", (cardData: NFCCardData) => {
      this.currentCardData = cardData;
      this.updateTrayMenu();
    });
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
        label: `${TRAY_MENU_LABELS.DEVICE_STATUS}: ${
          this.isNFCConnected ? "Connected" : "Disconnected"
        }`,
        enabled: false,
      },
      {
        label: TRAY_MENU_LABELS.RECONNECT,
        click: () => this.nfcService.reconnect(),
        enabled: !this.isNFCConnected,
      },
      { type: "separator" },
      {
        label: this.getCurrentCardLabel(),
        enabled: false,
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
   * Get current card label for menu
   */
  private getCurrentCardLabel(): string {
    if (!this.currentCardData) {
      return `${TRAY_MENU_LABELS.CURRENT_CARD}: None`;
    }
    return `${TRAY_MENU_LABELS.CURRENT_CARD}: ${this.currentCardData.name}`;
  }

  /**
   * Update tray tooltip with current card info
   */
  public updateTooltip(cardData: NFCCardData | null): void {
    if (!this.tray) return;

    let tooltip = TRAY_TOOLTIP;
    if (cardData) {
      tooltip += `\nCurrent Card: ${cardData.name}`;
    }
    if (!this.isNFCConnected) {
      tooltip += "\nNFC: Disconnected";
    }

    this.tray.setToolTip(tooltip);
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

  /**
   * Create a fallback icon when the main icon fails to load
   */
  private createFallbackIcon(): Electron.NativeImage {
    // Try alternative icon paths
    const fallbackPaths = [
      "Web/favicon-16x16.png",
      "Web/favicon-32x32.png",
      "Web/icon-48x48.png",
    ];

    for (const fallbackPath of fallbackPaths) {
      try {
        const iconPath = path.join(process.env.VITE_PUBLIC || "", fallbackPath);
        console.log("Trying fallback icon:", iconPath);
        const icon = nativeImage.createFromPath(iconPath);
        if (!icon.isEmpty()) {
          console.log("Successfully loaded fallback icon:", fallbackPath);
          return icon;
        }
      } catch (error) {
        console.log("Fallback icon failed:", fallbackPath, error);
      }
    }

    // If all else fails, create a simple programmatic icon
    console.log("Creating programmatic fallback icon");
    return nativeImage.createFromDataURL(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwQLwcJCG1sLwcJCG9vYaGOjjY1tbLSx0cZGGxtb7S/wB1jY2GhjY6ONjTY22thoY6ONjY02NtrYaGOjjY02NtrYaGOjjY02NtrYaGOjjY1/gQ8YmJmdZ2Z2ZgL8c8Q5RymlACillFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkop9Q/4BuF+XqHgd3sGAAAAAElFTkSuQmCC"
    );
  }
}
