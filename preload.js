const { contextBridge, ipcRenderer } = require('electron');

const listen = (channel) => (callback) => ipcRenderer.on(channel, (_e, data) => callback(data));

contextBridge.exposeInMainWorld('island', {
  setInteractive: (value) => ipcRenderer.send('set-interactive', value),
  media: (cmd) => ipcRenderer.send('media-cmd', cmd),
  setOutput: (id) => ipcRenderer.send('set-output', id),
  contextMenu: (info) => ipcRenderer.send('context-menu', info),
  getSettings: () => ipcRenderer.invoke('island:settings'),
  onSettings: listen('settings'),
  onMedia: listen('media'),
  onAppIcon: listen('app-icon'),
  onMic: listen('mic'),
  onCamera: listen('camera'),
  onVolume: listen('volume'),
  onOutput: listen('output'),
  onObs: listen('obs'),
  onTimer: listen('timer'),
  onNotify: listen('notify'),
  focusEnded: () => ipcRenderer.send('focus:ended'),
  onMouseLeft: listen('mouse-left'),
});
