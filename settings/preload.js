const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tandem', {
  get: () => ipcRenderer.invoke('settings:get'),
  set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  action: (name) => ipcRenderer.invoke('settings:action', name),
  setShortcut: (name, accel) => ipcRenderer.invoke('settings:shortcut', name, accel),
  pauseShortcuts: (paused) => ipcRenderer.send('shortcuts:pause', paused),
  window: (cmd) => ipcRenderer.send('settings:window', cmd),
  onChange: (callback) => ipcRenderer.on('settings', (_e, settings, info) => callback(settings, info)),
  onNavigate: (callback) => ipcRenderer.on('settings:navigate', (_e, page) => callback(page)),
});
