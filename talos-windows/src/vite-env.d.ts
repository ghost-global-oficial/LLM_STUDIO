/// <reference types="vite/client" />

interface TalosAPI {
  getModels(): Promise<string[]>;
  deleteModel(path: string): Promise<{ success: boolean; error?: string }>;
  getModelSize(path: string): Promise<number>;
  getSettings(): Promise<any>;
  saveSettings(s: any): Promise<boolean>;
  getSystemLocale(): Promise<string>;
  loadModel(path: string, config?: any): Promise<{ success: boolean; error?: string }>;
  unloadModel(): Promise<boolean>;
  getModelStatus(): Promise<{ loaded: boolean; path: string; name: string }>;
  chatCompletion(messages: any[], config?: any): Promise<{ text: string; tokens: number }>;
  startServer(port: number, apiKey: string): Promise<boolean>;
  stopServer(): Promise<boolean>;
  getServerStatus(): Promise<{ running: boolean }>;
  downloadModel(url: string, filename: string, modelId: string): Promise<{ success: boolean; path?: string; error?: string }>;
  onChatToken(cb: (token: string) => void): () => void;
  onChatError(cb: (err: string) => void): () => void;
  onModelStatus(cb: (s: any) => void): () => void;
  onServerLog(cb: (log: any) => void): () => void;
  hfSearchModels(query: string, sort?: string, limit?: number): Promise<any>;
  hfModelDetails(modelId: string): Promise<any>;
  hfModelFiles(modelId: string): Promise<any>;
  getHardwareInfo(): Promise<any>;
  onDownloadProgress(cb: (progress: any) => void): () => void;
  cancelDownload(): Promise<boolean>;
  stopChat(): Promise<boolean>;
  selectFolder(): Promise<{ path: string | null }>;
  saveConversations(data: string): Promise<boolean>;
  loadConversations(): Promise<string | null>;
  startEngine(settings?: any): Promise<{ success: boolean; running?: boolean; error?: string }>;
  stopEngine(): Promise<{ success: boolean }>;
  getEngineStatus(): Promise<{ running: boolean; ready: boolean; port: number }>;
  engineChat(messages: any[], options?: any): Promise<{ success: boolean; response?: string; error?: string }>;
  engineLoadModel(modelPath: string, gpuLayers?: number): Promise<{ success: boolean; error?: string }>;
  engineUnloadModel(): Promise<{ success: boolean; error?: string }>;
  onEngineStatus(cb: (s: any) => void): () => void;
  onAirllmAutoActivated(cb: (info: any) => void): () => void;
  onImageGenStatus(cb: (status: any) => void): () => void;
  getAirllmStatus(): Promise<{ pythonFound: boolean; pythonPath: string; airllmInstalled: boolean; airllmVersion: string }>;
  installAirllm(): Promise<{ success: boolean; error: string }>;
  startAirllmServer(): Promise<{ success: boolean; port: number; error: string }>;
  stopAirllmServer(): Promise<{ success: boolean }>;
  airllmGenerate(prompt: string, modelPath?: string, maxTokens?: number): Promise<{ response?: string; error?: string }>;
  getImageGenStatus(): Promise<{ pythonFound: boolean; pythonPath: string; torchInstalled: boolean; diffusersInstalled: boolean; serverRunning: boolean }>;
  startImageGenServer(): Promise<{ success: boolean; port?: number; error?: string }>;
  stopImageGenServer(): Promise<{ success: boolean }>;
  imageGenLoadModel(model: string, lowRam?: boolean): Promise<{ success: boolean; error?: string }>;
  imageGenUnloadModel(): Promise<{ success: boolean }>;
  imageGenGenerate(opts: any): Promise<{ success: boolean; image?: string; error?: string }>;
  imageGenModels(): Promise<{ models: string[] }>;
  getInstalledImageGenModels(): Promise<{ id: string; name: string; path: string }[]>;
  selectFolder(): Promise<{ path: string | null }>;
  selectFiles(): Promise<{ paths: string[] }>;
  checkEngineUpdates(): Promise<Record<string, { current: string; latest: string; hasUpdate: boolean; error?: string }>>;
}

declare global {
  interface Window {
    talos: TalosAPI;
  }
}

export {};
