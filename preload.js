const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  onMediaUpdate: (callback) => ipcRenderer.on('media-update', (event, data) => callback(data)),
  onCollapse: (callback) => ipcRenderer.on('collapse', () => callback()),
  toggleExpand: (expanded) => ipcRenderer.send('toggle-expand', expanded),
  mediaControl: (action) => ipcRenderer.send('media-control', action),
  closeApp: () => ipcRenderer.send('close-app'),
  getStartup: () => ipcRenderer.invoke('get-startup'),
  setStartup: (enabled) => ipcRenderer.send('toggle-startup', enabled),
  openExternal: (url) => ipcRenderer.send('open-external', url)
});
