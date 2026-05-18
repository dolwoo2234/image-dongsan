const { contextBridge, ipcRenderer, webUtils } = require('electron');

const dongsanApi = {
  loadProject: () => ipcRenderer.invoke('project:load'),
  importText: () => ipcRenderer.invoke('project:importText'),
  addScene: (afterSceneId) => ipcRenderer.invoke('project:addScene', afterSceneId),
  deleteScene: (sceneId) => ipcRenderer.invoke('project:deleteScene', sceneId),
  generateTags: (sceneId) => ipcRenderer.invoke('project:generateTags', sceneId),
  mockGenerate: (sceneId) => ipcRenderer.invoke('project:mockGenerate', sceneId),
  novelAiGenerate: (sceneId) => ipcRenderer.invoke('project:novelAiGenerate', sceneId),
  cancelNovelAiGeneration: () => ipcRenderer.invoke('project:cancelNovelAiGeneration'),
  updateImage: (imageId, patch) => ipcRenderer.invoke('project:updateImage', imageId, patch),
  readImageMetadata: (imagePath) => ipcRenderer.invoke('project:readImageMetadata', imagePath),
  importImageForScene: (sceneId, imagePath, metadata) => ipcRenderer.invoke('project:importImageForScene', sceneId, imagePath, metadata),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  keepAndExportImage: (imageId) => ipcRenderer.invoke('project:keepAndExportImage', imageId),
  mockVariation: (imageId) => ipcRenderer.invoke('project:mockVariation', imageId),
  novelAiVariation: (imageId, sceneOverride) => ipcRenderer.invoke('project:novelAiVariation', imageId, sceneOverride),
  novelAiImageToImage: (imageId, sceneOverride, strength, noise) => ipcRenderer.invoke('project:novelAiImageToImage', imageId, sceneOverride, strength, noise),
  novelAiInpaint: (imageId, sceneOverride, maskDataUrl, strength) => ipcRenderer.invoke('project:novelAiInpaint', imageId, sceneOverride, maskDataUrl, strength),
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
