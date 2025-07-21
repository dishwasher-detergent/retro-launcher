import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron';
import * as path from 'path';
import { NFCTagData } from './nfc-service.interface';

export class SystemTrayService {
  private tray: Tray | null = null;
  private isNFCConnected = false;
  private currentTag: NFCTagData | null = null;
  private mainWindow: BrowserWindow | null = null;
  private hasShownFirstHideNotification = false;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.createTray();
  }

  private createTray() {
    const RESOURCES_PATH = app.isPackaged
      ? path.join(process.resourcesPath, 'assets')
      : path.join(__dirname, '../../assets');

    const getAssetPath = (...paths: string[]): string => {
      return path.join(RESOURCES_PATH, ...paths);
    };

    // Create tray icon - we'll use different icons based on state
    const iconPath = getAssetPath('icon.png');
    let trayIcon = nativeImage.createFromPath(iconPath);

    // Resize icon for system tray (16x16 for Windows)
    trayIcon = trayIcon.resize({ width: 16, height: 16 });

    this.tray = new Tray(trayIcon);
    this.tray.setToolTip('Retro Launcher - NFC Disconnected');

    // Add double-click handler to show the main window
    this.tray.on('double-click', () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });

    this.updateContextMenu();
  }

  private updateContextMenu() {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: this.isNFCConnected
          ? 'NFC Reader: Connected'
          : 'NFC Reader: Disconnected',
        enabled: false,
      },
      {
        type: 'separator',
      },
      {
        label: this.currentTag
          ? `Current Tag: ${this.currentTag.description}`
          : 'No Game Detected',
        enabled: false,
      },
      {
        label: this.currentTag ? `File: ${this.currentTag.filePath}` : '',
        enabled: false,
        visible: this.isNFCConnected && !!this.currentTag,
      },
      {
        type: 'separator',
        visible: this.isNFCConnected && !!this.currentTag,
      },
      {
        type: 'separator',
      },
      {
        label: 'Quit Retro Launcher',
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  public updateNFCStatus(connected: boolean) {
    this.isNFCConnected = connected;

    if (!this.tray) return;

    // Update tooltip
    this.tray.setToolTip(
      connected
        ? 'Retro Launcher - NFC Connected'
        : 'Retro Launcher - NFC Disconnected',
    );

    // Update icon color/style based on connection status
    const RESOURCES_PATH = app.isPackaged
      ? path.join(process.resourcesPath, 'assets')
      : path.join(__dirname, '../../assets');

    const getAssetPath = (...paths: string[]): string => {
      return path.join(RESOURCES_PATH, ...paths);
    };

    let iconPath = getAssetPath('icon.png');
    let trayIcon = nativeImage.createFromPath(iconPath);

    // Make icon grayscale if disconnected (simple approach)
    if (!connected) {
      // For now, we'll just use the same icon but could create separate icons
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
    } else {
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
    }

    this.tray.setImage(trayIcon);
    this.updateContextMenu();
  }

  public updateCurrentTag(tagData: NFCTagData | null) {
    this.currentTag = tagData;
    this.updateContextMenu();

    // Show notification when tag is detected
    if (tagData) {
      this.showTagNotification(tagData);
    }
  }

  public showTagNotification(tagData: NFCTagData) {
    if (this.tray) {
      this.tray.displayBalloon({
        title: 'NFC Tag Detected',
        content: `Opening: ${tagData.description}`,
        icon: nativeImage.createFromPath(
          path.join(__dirname, '../../assets/icon.png'),
        ),
      });
      this.tray.setToolTip('Retro Launcher - NFC Connected');
    }
  }

  public showFirstHideNotification() {
    if (this.tray) {
      this.tray.displayBalloon({
        title: 'Retro Launcher',
        content:
          'App was minimized to tray. Click the tray icon to open the app again.',
        icon: nativeImage.createFromPath(
          path.join(__dirname, '../../assets/icon.png'),
        ),
      });
    }
  }

  public dispose() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
