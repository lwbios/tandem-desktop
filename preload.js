const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('island', {
  setInteractive: (value) => ipcRenderer.send('set-interactive', value),
  media: (cmd) => ipcRenderer.send('media-cmd', cmd),
  contextMenu: (info) => ipcRenderer.send('context-menu', info),
  onMedia: (callback) => ipcRenderer.on('media', (_e, data) => callback(data)),
  onAppIcon: (callback) => ipcRenderer.on('app-icon', (_e, data) => callback(data)),
  onMic:(callback) => ipcRenderer.on('mic', (_e, data) => callback(data)),
  onVolume:(callback) => ipcRenderer.on('volume', (_e, data) => callback(data)),
  onTimer: (callback) => ipcRenderer.on('timer', (_e, data) => callback(data)),
  onMouseLeft: (callback) => ipcRenderer.on('mouse-left', () => callback()),
});
