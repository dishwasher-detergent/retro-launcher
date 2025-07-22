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
        label: `${TRAY_MENU_LABELS.NFC_STATUS}: ${
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
}
