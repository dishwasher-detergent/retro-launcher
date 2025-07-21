// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { ElectronIPCAPI, IPCChannels } from '../interfaces/electron.interface';

import {
  NFCConnectionStatus,
  NFCTagData,
} from '../interfaces/nfc-service.interface';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: IPCChannels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: IPCChannels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: IPCChannels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    invoke(channel: string, ...args: unknown[]) {
      return ipcRenderer.invoke(channel, ...args);
    },
  } as ElectronIPCAPI,
  nfc: {
    getStatus: (): Promise<NFCConnectionStatus> =>
      ipcRenderer.invoke('get-nfc-status'),
    onStatusChanged: (callback: (status: NFCConnectionStatus) => void) => {
      const subscription = (
        _event: IpcRendererEvent,
        status: NFCConnectionStatus,
      ) => callback(status);
      ipcRenderer.on('nfc-status-changed', subscription);
      return () =>
        ipcRenderer.removeListener('nfc-status-changed', subscription);
    },
    onTagDetected: (callback: (tagData: NFCTagData) => void) => {
      const subscription = (_event: IpcRendererEvent, tagData: NFCTagData) =>
        callback(tagData);
      ipcRenderer.on('nfc-tag-detected', subscription);
      return () => ipcRenderer.removeListener('nfc-tag-detected', subscription);
    },
    onTagRemoved: (callback: () => void) => {
      const subscription = (_event: IpcRendererEvent) => callback();
      ipcRenderer.on('nfc-tag-removed', subscription);
      return () => ipcRenderer.removeListener('nfc-tag-removed', subscription);
    },
  },
  app: {
    showMainWindow: () => ipcRenderer.invoke('show-main-window'),
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
