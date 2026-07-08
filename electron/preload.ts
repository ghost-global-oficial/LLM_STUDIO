import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('talos', {
  getModels: () => ipcRenderer.invoke('get-models'),
  deleteModel: (path: string) => ipcRenderer.invoke('delete-model', path),
  getModelSize: (p: string) => ipcRenderer.invoke('get-model-size', p),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s: any) => ipcRenderer.invoke('save-settings', s),
  getSystemLocale: () => ipcRenderer.invoke('get-system-locale'),
  loadModel: (path: string, config?: any) => ipcRenderer.invoke('load-model', path, config),
  unloadModel: () => ipcRenderer.invoke('unload-model'),
  getModelStatus: () => ipcRenderer.invoke('get-model-status'),
  chatCompletion: (messages: any[], config?: any) => ipcRenderer.invoke('chat-completion', messages, config),
  startServer: (port: number, apiKey: string) => ipcRenderer.invoke('start-server', port, apiKey),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  downloadModel: (url: string, filename: string, modelId: string) => ipcRenderer.invoke('download-model', url, filename, modelId),
  hfSearchModels: (query: string, sort?: string, limit?: number) => ipcRenderer.invoke('hf-search-models', query, sort, limit),
  hfModelDetails: (modelId: string) => ipcRenderer.invoke('hf-model-details', modelId),
  hfModelFiles: (modelId: string) => ipcRenderer.invoke('hf-model-files', modelId),
  getHardwareInfo: () => ipcRenderer.invoke('get-hardware-info'),
  setSystemPrompt: (prompt: string) => ipcRenderer.invoke('set-system-prompt', prompt),
  onChatToken: (cb: (token: string) => void) => {
    ipcRenderer.on('chat-token', (_e, token) => cb(token));
    return () => ipcRenderer.removeAllListeners('chat-token');
  },
  onChatError: (cb: (err: string) => void) => {
    ipcRenderer.on('chat-error', (_e, err) => cb(err));
    return () => ipcRenderer.removeAllListeners('chat-error');
  },
  onModelStatus: (cb: (s: any) => void) => {
    ipcRenderer.on('model-status', (_e, s) => cb(s));
    return () => ipcRenderer.removeAllListeners('model-status');
  },
  onServerLog: (cb: (log: any) => void) => {
    ipcRenderer.on('server-log', (_e, log) => cb(log));
    return () => ipcRenderer.removeAllListeners('server-log');
  },
  onDownloadProgress: (cb: (progress: any) => void) => {
    ipcRenderer.on('download-progress', (_e, progress) => cb(progress));
    return () => ipcRenderer.removeAllListeners('download-progress');
  },
  cancelDownload: () => ipcRenderer.invoke('cancel-download'),
  stopChat: () => ipcRenderer.invoke('stop-chat'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFiles: () => ipcRenderer.invoke('select-files'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  saveConversations: (data: string) => ipcRenderer.invoke('save-conversations', data),
  loadConversations: () => ipcRenderer.invoke('load-conversations'),
  startEngine: (settings?: any) => ipcRenderer.invoke('start-engine', settings),
  stopEngine: () => ipcRenderer.invoke('stop-engine'),
  getEngineStatus: () => ipcRenderer.invoke('get-engine-status'),
  engineChat: (messages: any[], options?: any) => ipcRenderer.invoke('engine-chat', messages, options),
  engineLoadModel: (modelPath: string, gpuLayers?: number) => ipcRenderer.invoke('engine-load-model', modelPath, gpuLayers),
  engineUnloadModel: () => ipcRenderer.invoke('engine-unload-model'),
  onEngineStatus: (cb: (s: any) => void) => {
    ipcRenderer.on('engine-status', (_e, s) => cb(s));
    return () => ipcRenderer.removeAllListeners('engine-status');
  },
  onAirllmAutoActivated: (cb: (info: any) => void) => {
    ipcRenderer.on('airllm-auto-activated', (_e, info) => cb(info));
    return () => ipcRenderer.removeAllListeners('airllm-auto-activated');
  },
  onImageGenStatus: (cb: (status: any) => void) => {
    ipcRenderer.on('imagegen-server-status', (_e, status) => cb(status));
    return () => ipcRenderer.removeAllListeners('imagegen-server-status');
  },
  getAirllmStatus: () => ipcRenderer.invoke('get-airllm-status'),
  installAirllm: () => ipcRenderer.invoke('install-airllm'),
  startAirllmServer: () => ipcRenderer.invoke('start-airllm-server'),
  stopAirllmServer: () => ipcRenderer.invoke('stop-airllm-server'),
  checkEngineUpdates: () => ipcRenderer.invoke('check-engine-updates'),
  airllmGenerate: (prompt: string, modelPath?: string, maxTokens?: number) => ipcRenderer.invoke('airllm-generate', { prompt, modelPath, maxTokens }),
  getImageGenStatus: () => ipcRenderer.invoke('get-imagegen-status'),
  startImageGenServer: () => ipcRenderer.invoke('start-imagegen-server'),
  stopImageGenServer: () => ipcRenderer.invoke('stop-imagegen-server'),
  imageGenLoadModel: (model: string, lowRam?: boolean) => ipcRenderer.invoke('imagegen-load-model', { model, lowRam }),
  imageGenUnloadModel: () => ipcRenderer.invoke('imagegen-unload-model'),
  imageGenGenerate: (opts: any) => ipcRenderer.invoke('imagegen-generate', opts),
  imageGenModels: () => ipcRenderer.invoke('imagegen-models'),
  getInstalledImageGenModels: () => ipcRenderer.invoke('get-installed-imagegen-models'),
});
