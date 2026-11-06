const { contextBridge, ipcRenderer } = require('electron');

const listen = (channel) => (callback) => ipcRenderer.on(channel, (_e, data) => callback(data));

contextBridge.exposeInMainWorld('launcher', {
  init: () => ipcRenderer.invoke('launcher:init'),
  icons: (names) => ipcRenderer.invoke('launcher:icons', names),
  run: (action) => ipcRenderer.send('launcher:run', action),
  search: (query, mode) => ipcRenderer.invoke('launcher:search', query, mode),
  fileIcons: (paths) => ipcRenderer.invoke('launcher:fileIcons', paths),
  screens: () => ipcRenderer.invoke('launcher:screens'),
  clipboardText: () => ipcRenderer.invoke('launcher:clipboardText'),
  drag: (path) => ipcRenderer.send('launcher:drag', path),
  onOpen: listen('launcher:open'),
  onApps: listen('launcher:apps'),
  onHistory: listen('launcher:history'),
  onSettings: listen('launcher:settings'),
});
