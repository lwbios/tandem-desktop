const { contextBridge, ipcRenderer } = require('electron');

const listen = (channel) => (callback) => ipcRenderer.on(channel, (_e, data) => callback(data));

contextBridge.exposeInMainWorld('launcher', {
  init: () => ipcRenderer.invoke('launcher:init'),
  icons: (names) => ipcRenderer.invoke('launcher:icons', names),
  run: (action) => ipcRenderer.send('launcher:run', action),
  onOpen: listen('launcher:open'),
  onApps: listen('launcher:apps'),
  onHistory: listen('launcher:history'),
  onSettings: listen('launcher:settings'),
});
