const { contextBridge, ipcRenderer } = require('electron');

const dongsanApi = {
  loadProject: () => ipcRenderer.invoke('project:load'),
  importText: () => ipcRenderer.invoke('project:importText'),
  generateTags: (sceneId) => ipcRenderer.invoke('project:generateTags', sceneId),
  mockGenerate: (sceneId) => ipcRenderer.invoke('project:mockGenerate', sceneId),
  novelAiGenerate: (sceneId) => ipcRenderer.invoke('project:novelAiGenerate', sceneId),
  cancelNovelAiGeneration: () => ipcRenderer.invoke('project:cancelNovelAiGeneration'),
  updateImage: (imageId, patch) => ipcRenderer.invoke('project:updateImage', imageId, patch),
  keepAndExportImage: (imageId) => ipcRenderer.invoke('project:keepAndExportImage', imageId),
  mockVariation: (imageId) => ipcRenderer.invoke('project:mockVariation', imageId),
  novelAiVariation: (imageId, sceneOverride) => ipcRenderer.invoke('project:novelAiVariation', imageId, sceneOverride),
  onGenerationStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('generation:status', listener);
    return () => ipcRenderer.removeListener('generation:status', listener);
  },
  saveScene: (scene) => ipcRenderer.invoke('project:saveScene', scene),
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (payload) => ipcRenderer.invoke('settings:save', payload),
  importTagDictionary: () => ipcRenderer.invoke('settings:importTagDictionary'),
  clearApiKey: () => ipcRenderer.invoke('settings:clearApiKey'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  applyUpdate: () => ipcRenderer.invoke('app:applyUpdate')
};

contextBridge.exposeInMainWorld('dongsan', dongsanApi);
contextBridge.exposeInMainWorld('harness', dongsanApi);
