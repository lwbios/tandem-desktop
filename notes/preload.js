const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notes', {
  update: (id, text) => ipcRenderer.send('notes:update', { id, text }),
  create: () => ipcRenderer.invoke('notes:create'),
  remove: (id) => ipcRenderer.invoke('notes:delete', id),
  pin: (value) => ipcRenderer.send('notes:pin', value),
  window: (cmd) => ipcRenderer.send('notes:window', cmd),
  onData: (callback) => ipcRenderer.on('notes:data', (_e, data) => callback(data)),
});
