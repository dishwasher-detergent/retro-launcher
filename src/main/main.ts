/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import path from 'path';

import { NFCService } from '../services/nfc.service';
import { SystemTrayService } from '../services/system-tray.service';
import { resolveHtmlPath } from './util';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let nfcService: NFCService | null = null;
let systemTray: SystemTrayService | null = null;
let isQuiting = false;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain.handle('get-nfc-status', () => {
  return (
    nfcService?.getConnectionStatus() || {
      connected: false,
      message: 'NFC service not initialized',
    }
  );
});

ipcMain.handle('show-main-window', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 500,
    height: 600,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
    skipTaskbar: false,
    minimizable: true,
    autoHideMenuBar: true,
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }

    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault();
      mainWindow?.hide();

      if (systemTray) {
        systemTray.showFirstHideNotification();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Removed menu builder to hide File, View, Help menu
  // const menuBuilder = new MenuBuilder(mainWindow);
  // menuBuilder.buildMenu();

  // Initialize system tray
  systemTray = new SystemTrayService(mainWindow);
  nfcService = new NFCService();

  nfcService.onConnectionStatusChanged((connected, message) => {
    systemTray?.updateNFCStatus(connected);
    mainWindow?.webContents.send('nfc-status-changed', { connected, message });
  });

  nfcService.onTagDetected((tagData) => {
    systemTray?.updateCurrentTag(tagData);
    mainWindow?.webContents.send('nfc-tag-detected', tagData);
  });

  nfcService.onTagRemoved(() => {
    systemTray?.updateCurrentTag(null);
    mainWindow?.webContents.send('nfc-tag-removed');
  });

  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Don't quit the app when all windows are closed - keep running in system tray
  // This allows the app to continue running like Discord
});

app.on('before-quit', () => {
  isQuiting = true;
  nfcService?.dispose();
  systemTray?.dispose();
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
