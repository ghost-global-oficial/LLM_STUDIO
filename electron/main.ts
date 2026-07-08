import { app, BrowserWindow, ipcMain, safeStorage, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import express from 'express';
import { ChildProcess, spawn } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let currentModel: any = null;
let currentModelPath = '';
let serverSystemPrompt = '';
let currentLlama: any = null;
let currentContext: any = null;
let isChatting = false;

let talosEngine: ChildProcess | null = null;
let talosEngineReady = false;
let talosEnginePort = 11435;

const DEFAULT_MODELS_DIR = path.join(app.getPath('userData'), 'models');
const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

function getModelsDir(settings: any): string {
  if (settings.downloadFolder && typeof settings.downloadFolder === 'string' && settings.downloadFolder.trim()) {
    return settings.downloadFolder.trim();
  }
  return DEFAULT_MODELS_DIR;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getSettings(): any {
  try {
    const saved = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    if (saved.theme === 'dark' && !saved.themeExplicit) {
      saved.theme = 'light';
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(saved, null, 2));
    }
    return saved;
  } catch {
    return { theme: 'light', port: 1234, apiKey: 'talos-key-secret', nCtx: 4096, gpuLayers: 0 };
  }
}

function saveSettings(s: any) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2));
}

function scanModels(): string[] {
  const MODELS_DIR = getModelsDir(getSettings());
  const extraDirs = [MODELS_DIR];
  try {
    const exeDir = path.dirname(app.getPath('exe'));
    const appPath = app.getAppPath();
    const candidates = [
      path.join(exeDir, '..', 'models'),
      path.join(exeDir, '..', '..', 'models'),
      path.join(appPath, 'models'),
      path.join(appPath, '..', 'models'),
    ];
    for (const c of candidates) {
      const resolved = path.resolve(c);
      if (fs.existsSync(resolved) && !extraDirs.includes(resolved)) extraDirs.push(resolved);
    }
  } catch {}
  console.log(`[TALOS] scanModels: scanning directories:`, extraDirs);
  const results: string[] = [];
  const seen = new Set<string>();
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (fs.existsSync(path.join(full, 'model_index.json'))) {
          console.log(`[TALOS] scanModels: skipping diffusers model: ${entry.name}`);
        } else {
          walk(full);
        }
      } else if (entry.name.endsWith('.gguf')) {
        if (!seen.has(full)) { seen.add(full); results.push(full); }
      }
    }
  }
  for (const d of extraDirs) walk(d);
  console.log(`[TALOS] scanModels: found ${results.length} models:`, results.map(r => path.basename(r)));
  return results;
}

function analyzeModelForAirllm(modelPath: string): { needsAirllm: boolean; reason: string; modelType: string; modelSize: string } {
  const filename = path.basename(modelPath).toLowerCase();
  let needsAirllm = false;
  let reason = '';
  let modelType = 'text';
  let modelSize = '';

  if (/image|img2img|stable.?diffusion|flux|dall.?e|midjourney|sdxl|sd_|comfyui|画图|绘图/.test(filename)) {
    modelType = 'image';
    needsAirllm = true;
    reason = 'Image generation model detected';
  }
  if (/video|sora|runway|kling|pika|wan2|cogvideo|animate|motion|video.?gen/.test(filename)) {
    modelType = 'video';
    needsAirllm = true;
    reason = 'Video generation model detected';
  }
  if (/3d|threed|mesh|nerf|gaussian.?splat|point.?cloud|voxel|shape|sculpt|blender|open3d|tripl|instantmesh|crm|large.?reconstruction|sr3d/.test(filename)) {
    modelType = '3d';
    needsAirllm = true;
    reason = '3D generation model detected';
  }

  const sizeMatch = filename.match(/[_-](\d+\.?\d*)[bB]/);
  if (sizeMatch) {
    const sizeBillions = parseFloat(sizeMatch[1]);
    modelSize = `${sizeMatch[1]}B`;
    if (sizeBillions >= 70) {
      needsAirllm = true;
      reason = reason ? `${reason}, ${sizeBillions}B model requires low-memory inference` : `${sizeBillions}B model requires low-memory inference`;
    }
  }

  const sizeGB = (() => {
    try { return fs.statSync(modelPath).size / (1024 * 1024 * 1024); } catch { return 0; }
  })();
  if (sizeGB > 40 && !needsAirllm) {
    needsAirllm = true;
    modelSize = modelSize || `~${sizeGB.toFixed(0)}GB`;
    reason = reason ? `${reason}, model file is ${sizeGB.toFixed(1)}GB` : `Model file is ${sizeGB.toFixed(1)}GB, may need low-memory inference`;
  }

  return { needsAirllm, reason, modelType, modelSize };
}

function checkHardwareForModel(analysis: { modelType: string; modelSize: string }): { sufficient: boolean; ramGB: number; vramGB: number; neededRAM: number; neededVRAM: number } {
  let ramGB = 0;
  let vramGB = 0;
  try {
    const totalMem = require('os').totalmem();
    ramGB = totalMem / (1024 * 1024 * 1024);
  } catch {}
  try {
    const cpus = require('os').cpus();
    const gpuInfo = (global as any).__gpuInfo;
    if (gpuInfo?.vramMB) vramGB = gpuInfo.vramMB / 1024;
  } catch {}

  let neededRAM = 8;
  let neededVRAM = 4;

  if (analysis.modelType === 'image') {
    neededRAM = 16;
    neededVRAM = 8;
  } else if (analysis.modelType === 'video') {
    neededRAM = 32;
    neededVRAM = 16;
  } else if (analysis.modelType === '3d') {
    neededRAM = 32;
    neededVRAM = 12;
  } else if (analysis.modelSize) {
    const sizeNum = parseFloat(analysis.modelSize);
    if (sizeNum >= 70) { neededRAM = 64; neededVRAM = 24; }
    else if (sizeNum >= 30) { neededRAM = 32; neededVRAM = 12; }
    else if (sizeNum >= 13) { neededRAM = 16; neededVRAM = 8; }
    else if (sizeNum >= 7) { neededRAM = 8; neededVRAM = 6; }
  }

  const sufficient = ramGB >= neededRAM || vramGB >= neededVRAM;
  return { sufficient, ramGB, vramGB, neededRAM, neededVRAM };
}

function applyGuardrails(modelPath: string, config: any): any {
  const s = getSettings();
  const guardrails = s.guardrails || 'balanced';
  if (guardrails === 'off') return config;

  try {
    const stat = fs.statSync(modelPath);
    const modelSizeMB = stat.size / (1024 * 1024);
    const totalRAM = os.totalmem() / (1024 * 1024);
    const freeRAM = os.freemem() / (1024 * 1024);

    let maxModelPercent = 1.0;
    switch (guardrails) {
      case 'relaxed': maxModelPercent = 0.9; break;
      case 'balanced': maxModelPercent = 0.75; break;
      case 'conservative': maxModelPercent = 0.5; break;
    }

    const maxModelMB = totalRAM * maxModelPercent;
    if (modelSizeMB > maxModelMB) {
      console.log(`[TALOS] Guardrails: model ${(modelSizeMB / 1024).toFixed(1)}GB exceeds ${guardrails} limit ${(maxModelMB / 1024).toFixed(1)}GB, reducing GPU layers`);
      const newConfig = { ...config };
      if (newConfig.gpuLayers > 0) {
        const ratio = maxModelMB / modelSizeMB;
        newConfig.gpuLayers = Math.max(0, Math.floor(newConfig.gpuLayers * ratio));
        console.log(`[TALOS] Guardrails: adjusted gpuLayers from ${config.gpuLayers} to ${newConfig.gpuLayers}`);
      }
      return newConfig;
    }

    return config;
  } catch (err: any) {
    console.log('[TALOS] Guardrails: could not check model size:', err.message);
    return config;
  }
}

async function loadModel(modelPath: string, config: any = {}) {
  console.log(`[TALOS] Loading model: ${modelPath}`);
  console.log(`[TALOS] Config:`, JSON.stringify(config));

  config = applyGuardrails(modelPath, config);

  if (currentModel) {
    console.log('[TALOS] Unloading previous model...');
    try { await currentModel.dispose(); } catch (e: any) { console.log('[TALOS] Dispose error:', e.message); }
    currentModel = null;
    currentModelPath = '';
  }
  try {
    console.log('[TALOS] Importing node-llama-cpp...');
    const { getLlama } = await import('node-llama-cpp');
    console.log('[TALOS] Getting llama instance...');
    currentLlama = await getLlama({ gpu: false });
    console.log('[TALOS] Loading model with gpuLayers:', config.gpuLayers ?? 0);
    currentModel = await currentLlama.loadModel({
      modelPath,
      gpuLayers: config.gpuLayers ?? 0,
    });
    console.log('[TALOS] Model object created');
    currentContext = await currentModel.createContext();
    console.log('[TALOS] Context created on load');
    currentModelPath = modelPath;
    console.log('[TALOS] Model loaded successfully!');
    mainWindow?.webContents.send('model-status', { loaded: true, path: modelPath });
    return true;
  } catch (err: any) {
    console.error('[TALOS] Model load FAILED:', err.message);
    mainWindow?.webContents.send('model-status', { loaded: false, path: '' });
    throw err;
  }
}

async function unloadModel() {
  if (currentContext) {
    try { currentContext.dispose(); } catch {}
    currentContext = null;
  }
  if (currentModel) {
    try { await currentModel.dispose(); } catch {}
    currentModel = null;
    currentModelPath = '';
  }
  currentLlama = null;
  mainWindow?.webContents.send('model-status', { loaded: false, path: '' });
}

function getEnginePath(): string {
  if (process.env.VITE_DEV_SERVER_URL) {
    return path.join(__dirname, '../engine/bin/talos-engine.exe');
  }
  return path.join(process.resourcesPath, 'engine', 'bin', 'talos-engine.exe');
}

function getCliPath(): string {
  if (process.env.VITE_DEV_SERVER_URL) {
    return path.join(__dirname, '../talos-cli/bin/talos-cli.exe');
  }
  return path.join(process.resourcesPath, 'talos-cli', 'bin', 'talos-cli.exe');
}

function startTalosEngine(settings: any): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (talosEngine) {
      resolve(true);
      return;
    }

    const enginePath = getEnginePath();
    if (!fs.existsSync(enginePath)) {
      console.error('[TALOS Engine] Binary not found:', enginePath);
      reject(new Error('Engine binary not found'));
      return;
    }

    const port = settings.talosEnginePort || talosEnginePort;
    const args = ['--serve', '--port', String(port)];
    if (settings.talosEngineModel) {
      args.push('--model', settings.talosEngineModel);
      if (settings.talosEngineGpuLayers !== undefined) {
        args.push('--gpu-layers', String(settings.talosEngineGpuLayers));
      }
    }

    console.log('[TALOS Engine] Starting:', enginePath, args.join(' '));

    talosEngine = spawn(enginePath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let buffer = '';

    talosEngine.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const resp = JSON.parse(trimmed);
          if (resp.pong) {
            talosEngineReady = true;
            console.log('[TALOS Engine] Ready on port', port);
            mainWindow?.webContents.send('engine-status', { running: true, port });
          }
        } catch {}
      }
    });

    talosEngine.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.log('[TALOS Engine]', msg);
    });

    talosEngine.on('close', (code) => {
      console.log('[TALOS Engine] Process exited with code', code);
      talosEngine = null;
      talosEngineReady = false;
      mainWindow?.webContents.send('engine-status', { running: false });
    });

    talosEngine.on('error', (err) => {
      console.error('[TALOS Engine] Spawn error:', err.message);
      talosEngine = null;
      talosEngineReady = false;
      reject(err);
    });

    setTimeout(() => {
      sendEngineCommand({ action: 'ping' });
    }, 1000);

    setTimeout(() => {
      if (talosEngineReady) {
        resolve(true);
      } else {
        resolve(false);
      }
    }, 5000);
  });
}

function stopTalosEngine() {
  if (talosEngine) {
    talosEngine.kill();
    talosEngine = null;
    talosEngineReady = false;
    mainWindow?.webContents.send('engine-status', { running: false });
  }
}

let talosCli: any = null;
let talosCliReady = false;

function startTalosCli(settings: any): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (talosCli) {
      resolve(true);
      return;
    }

    const cliPath = getCliPath();
    if (!fs.existsSync(cliPath)) {
      console.error('[TALOS CLI] Binary not found:', cliPath);
      reject(new Error('CLI binary not found'));
      return;
    }

    const port = settings.talosEnginePort || talosEnginePort;
    const args = ['serve', '--port', String(port)];
    if (settings.talosEngineGpuLayers !== undefined) {
      args.push('--gpu-layers', String(settings.talosEngineGpuLayers));
    }

    console.log('[TALOS CLI] Starting:', cliPath, args.join(' '));

    talosCli = spawn(cliPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    talosCli.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.log('[TALOS CLI]', msg);
      if (msg.includes('Server listening')) {
        talosCliReady = true;
        mainWindow?.webContents.send('engine-status', { running: true, port });
      }
    });

    talosCli.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.log('[TALOS CLI]', msg);
    });

    talosCli.on('close', (code: number) => {
      console.log('[TALOS CLI] Process exited with code', code);
      talosCli = null;
      talosCliReady = false;
      mainWindow?.webContents.send('engine-status', { running: false });
    });

    talosCli.on('error', (err: any) => {
      console.error('[TALOS CLI] Spawn error:', err.message);
      talosCli = null;
      talosCliReady = false;
      reject(err);
    });

    setTimeout(() => {
      if (talosCliReady) {
        resolve(true);
      } else {
        resolve(false);
      }
    }, 5000);
  });
}

function stopTalosCli() {
  if (talosCli) {
    talosCli.kill();
    talosCli = null;
    talosCliReady = false;
    mainWindow?.webContents.send('engine-status', { running: false });
  }
}

function engineApiPort(): number {
  const s = getSettings();
  return s.talosEnginePort || talosEnginePort;
}

async function loadModelViaEngineApi(modelPath: string, gpuLayers: number): Promise<boolean> {
  return new Promise((resolve) => {
    const http = require('http');
    const postData = JSON.stringify({ path: modelPath, gpu_layers: gpuLayers });
    const req = http.request({
      hostname: '127.0.0.1',
      port: engineApiPort(),
      path: '/api/load',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 120000,
    }, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => { data += chunk; });
      res.on('end', () => {
        try {
          const resp = JSON.parse(data);
          resolve(resp.success === true);
        } catch {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.write(postData);
    req.end();
  });
}

async function unloadModelViaEngineApi(): Promise<boolean> {
  return new Promise((resolve) => {
    const http = require('http');
    const req = http.request({
      hostname: '127.0.0.1',
      port: engineApiPort(),
      path: '/api/unload',
      method: 'POST',
      timeout: 30000,
    }, (res: any) => {
      res.on('data', () => {});
      res.on('end', () => resolve(true));
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

function sendEngineCommand(cmd: any) {
  if (talosEngine && talosEngine.stdin) {
    talosEngine.stdin.write(JSON.stringify(cmd) + '\n');
  }
}

async function talosEngineChat(messages: any[], options: any = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!talosEngine || !talosEngineReady) {
      reject(new Error('Engine not running'));
      return;
    }

    let buffer = '';
    const port = talosEnginePort;

    const http = require('http');
    const postData = JSON.stringify({
      model: 'default',
      messages,
      stream: false,
      options,
    });

    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 300000,
    }, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => { data += chunk; });
      res.on('end', () => {
        try {
          const resp = JSON.parse(data);
          resolve(resp.message?.content || resp.response || '');
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(postData);
    req.end();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    title: 'Talos LLM Studio',
    icon: path.join(__dirname, '../build/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const iconImage = nativeImage.createFromPath(path.join(__dirname, '../build/icon.ico'));
  mainWindow.setIcon(iconImage);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.on('did-finish-load', async () => {
    const s = getSettings();
    if (s.autoLoadLast && s.lastModelPath && fs.existsSync(s.lastModelPath) && !currentModel && !currentModelPath) {
      try {
        if (s.talosEngineBackend === 'talos-engine' || s.talosEngineBackend === 'talos-cli') {
          if (s.talosEngineBackend === 'talos-cli') {
            await startTalosCli(s);
            if (talosCliReady) {
              await loadModelViaEngineApi(s.lastModelPath, s.talosEngineGpuLayers ?? s.gpuLayers ?? 0);
              currentModelPath = s.lastModelPath;
              mainWindow?.webContents.send('model-status', { loaded: true, path: s.lastModelPath });
            }
          } else {
            await startTalosEngine(s);
            if (talosEngineReady) {
              const gpuLayers = s.talosEngineGpuLayers ?? s.gpuLayers ?? 0;
              talosEngine!.stdin!.write(JSON.stringify({ action: 'load_model', path: s.lastModelPath, params: { n_gpu_layers: gpuLayers } }) + '\n');
              currentModelPath = s.lastModelPath;
              mainWindow?.webContents.send('model-status', { loaded: true, path: s.lastModelPath });
            }
          }
        } else {
          await loadModel(s.lastModelPath, { gpuLayers: s.gpuLayers || 0 });
        }
        if (s.autoStartServer) {
          startApiServer(s.port || 1234, s.apiKey || '');
        }
      } catch (err: any) {
        console.error('[TALOS] Auto-load failed:', err.message);
      }
    }
  });
}

let apiServer: any = null;
function startApiServer(port: number, apiKey: string) {
  stopApiServer();
  const app = express();
  app.use(express.json());

  app.post('/v1/chat/completions', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (apiKey && (!auth || !auth.startsWith('Bearer ') || auth.slice(7) !== apiKey)) {
        return res.status(401).json({ error: { message: 'Invalid API key', type: 'auth_error' } });
      }

      const s = getSettings();
      if (s.talosEngineBackend === 'talos-engine' || s.talosEngineBackend === 'talos-cli') {
        if (!talosEngine || !talosEngineReady) {
          return res.status(400).json({ error: { message: 'Talos Engine not running', type: 'server_error' } });
        }
        const { messages, max_tokens, temperature, stream } = req.body;
        const result = await talosEngineChat(messages || [], { temperature: temperature || 0.7, num_predict: max_tokens || 2048 });
        return res.json({
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'talos-engine',
          choices: [{ index: 0, message: { role: 'assistant', content: result }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 0, completion_tokens: result.length, total_tokens: result.length },
        });
      }
      if (!currentModel) {
        return res.status(400).json({ error: { message: 'No model loaded', type: 'server_error' } });
      }
      const { messages, max_tokens, temperature, top_p, stream } = req.body;
      if (!messages || !messages.length) {
        return res.status(400).json({ error: { message: 'messages required', type: 'invalid_request_error' } });
      }
      const filtered = messages.map((m: any) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      }));
      const valid = ['system', 'user', 'assistant', 'tool'];
      for (const m of filtered) {
        if (!valid.includes(m.role)) {
          return res.status(400).json({ error: { message: `Invalid role: ${m.role}`, type: 'invalid_request_error' } });
        }
      }

      if (currentContext) {
        try { currentContext.dispose(); } catch {}
      }
      currentContext = await currentModel.createContext();
      const seq = currentContext.getSequence();

      let fullContext = '';
      let systemMsg = filtered.find((m: any) => m.role === 'system');
      if (!systemMsg && serverSystemPrompt) {
        fullContext += `<|system|>\n${serverSystemPrompt} <|end|>\n`;
      }
      for (const msg of filtered) {
        if (msg.role === 'system') {
          fullContext += `<|system|>\n${msg.content} <|end|>\n`;
        } else if (msg.role === 'user') {
          fullContext += `<|user|>\n${msg.content} <|end|>\n`;
        } else if (msg.role === 'assistant') {
          fullContext += `<|assistant|>\n${msg.content} <|end|>\n`;
        }
      }
      fullContext += `<|assistant|>\n`;

      const tokens = currentModel.tokenize(fullContext);
      const promptTokens = tokens.length;

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        let fullText = '';
        const completionId = `chatcmpl-${Date.now()}`;
        let tokenCount = 0;
        try {
          for await (const token of seq.evaluate(tokens, {
            maxTokens: max_tokens || 2048,
            temperature: temperature || 0.7,
          })) {
            const text = currentModel.detokenize([token]);
            if (text) {
              fullText += text;
              tokenCount++;
              const chunk = JSON.stringify({
                id: completionId,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: path.basename(currentModelPath),
                choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
              });
              res.write(`data: ${chunk}\n\n`);
            }
            if (fullText.includes('<|end|>') || fullText.includes('User:') || fullText.includes('Assistant:')) {
              break;
            }
          }
        } catch {}
        const endChunk = JSON.stringify({
          id: completionId,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: path.basename(currentModelPath),
          choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
          usage: { prompt_tokens: promptTokens, completion_tokens: tokenCount, total_tokens: promptTokens + tokenCount },
        });
        res.write(`data: ${endChunk}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        let fullText = '';
        let tokenCount = 0;
        for await (const token of seq.evaluate(tokens, {
          maxTokens: max_tokens || 2048,
          temperature: temperature || 0.7,
        })) {
          const text = currentModel.detokenize([token]);
          if (text) fullText += text;
          tokenCount++;
          if (fullText.includes('<|end|>') || fullText.includes('User:') || fullText.includes('Assistant:')) {
            break;
          }
        }
        res.json({
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: path.basename(currentModelPath),
          choices: [{ index: 0, message: { role: 'assistant', content: fullText }, finish_reason: 'stop' }],
          usage: { prompt_tokens: promptTokens, completion_tokens: tokenCount, total_tokens: promptTokens + tokenCount },
        });
      }
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: { message: err.message, type: 'server_error' } });
      } else {
        res.end();
      }
    }
  });

  app.post('/v1/completions', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (apiKey && (!auth || !auth.startsWith('Bearer ') || auth.slice(7) !== apiKey)) {
        return res.status(401).json({ error: { message: 'Invalid API key', type: 'auth_error' } });
      }

      const s = getSettings();
      if (s.talosEngineBackend === 'talos-engine' || s.talosEngineBackend === 'talos-cli') {
        if (!talosEngine || !talosEngineReady) {
          return res.status(400).json({ error: { message: 'Talos Engine not running', type: 'server_error' } });
        }
        const { prompt, max_tokens, temperature } = req.body;
        const messages = [{ role: 'user', content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }];
        const result = await talosEngineChat(messages, { temperature: temperature || 0.7, num_predict: max_tokens || 2048 });
        return res.json({
          id: `cmpl-${Date.now()}`,
          object: 'text_completion',
          created: Math.floor(Date.now() / 1000),
          model: 'talos-engine',
          choices: [{ index: 0, text: result, finish_reason: 'stop' }],
          usage: { prompt_tokens: 0, completion_tokens: result.length, total_tokens: result.length },
        });
      }
      if (!currentModel) {
        return res.status(400).json({ error: { message: 'No model loaded', type: 'server_error' } });
      }
      const { prompt, max_tokens, temperature, stream } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: { message: 'prompt required', type: 'invalid_request_error' } });
      }

      if (currentContext) {
        try { currentContext.dispose(); } catch {}
      }
      currentContext = await currentModel.createContext();
      const seq = currentContext.getSequence();

      const promptStr = typeof prompt === 'string' ? prompt : Array.isArray(prompt) ? prompt.join('') : String(prompt);
      const tokens = currentModel.tokenize(promptStr);
      const promptTokens = tokens.length;

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        let fullText = '';
        const completionId = `cmpl-${Date.now()}`;
        let tokenCount = 0;
        try {
          for await (const token of seq.evaluate(tokens, {
            maxTokens: max_tokens || 2048,
            temperature: temperature || 0.7,
          })) {
            const text = currentModel.detokenize([token]);
            if (text) {
              fullText += text;
              tokenCount++;
              const chunk = JSON.stringify({
                id: completionId,
                object: 'text_completion',
                created: Math.floor(Date.now() / 1000),
                model: path.basename(currentModelPath),
                choices: [{ index: 0, text, finish_reason: null }],
              });
              res.write(`data: ${chunk}\n\n`);
            }
            if (fullText.includes('<|end|>') || fullText.includes('User:') || fullText.includes('Assistant:')) {
              break;
            }
          }
        } catch {}
        const endChunk = JSON.stringify({
          id: completionId,
          object: 'text_completion',
          created: Math.floor(Date.now() / 1000),
          model: path.basename(currentModelPath),
          choices: [{ index: 0, text: '', finish_reason: 'stop' }],
          usage: { prompt_tokens: promptTokens, completion_tokens: tokenCount, total_tokens: promptTokens + tokenCount },
        });
        res.write(`data: ${endChunk}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        let fullText = '';
        let tokenCount = 0;
        for await (const token of seq.evaluate(tokens, {
          maxTokens: max_tokens || 2048,
          temperature: temperature || 0.7,
        })) {
          const text = currentModel.detokenize([token]);
          if (text) fullText += text;
          tokenCount++;
          if (fullText.includes('<|end|>') || fullText.includes('User:') || fullText.includes('Assistant:')) {
            break;
          }
        }
        res.json({
          id: `cmpl-${Date.now()}`,
          object: 'text_completion',
          created: Math.floor(Date.now() / 1000),
          model: path.basename(currentModelPath),
          choices: [{ index: 0, text: fullText, finish_reason: 'stop' }],
          usage: { prompt_tokens: promptTokens, completion_tokens: tokenCount, total_tokens: promptTokens + tokenCount },
        });
      }
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: { message: err.message, type: 'server_error' } });
      } else {
        res.end();
      }
    }
  });

  app.get('/v1/models', (_req, res) => {
    const s = getSettings();
    const modelPath = s.talosEngineBackend === 'talos-engine' ? currentModelPath : currentModelPath;
    res.json({
      object: 'list',
      data: modelPath
        ? [{ id: path.basename(modelPath), object: 'model', created: Math.floor(Date.now() / 1000), owned_by: 'talos' }]
        : [],
    });
  });

  app.get('/health', (_req, res) => {
    const s = getSettings();
    const loaded = s.talosEngineBackend === 'talos-engine' ? !!currentModelPath : !!currentModel;
    res.json({ status: 'ok', model_loaded: loaded });
  });

  apiServer = app.listen(port, '0.0.0.0', () => {
    mainWindow?.webContents.send('server-log', { type: 'info', text: `API server running on port ${port}` });
  });
  apiServer.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      mainWindow?.webContents.send('server-log', { type: 'error', text: `Port ${port} already in use. Trying port ${port + 1}...` });
      apiServer = null;
      startApiServer(port + 1, apiKey);
    } else {
      mainWindow?.webContents.send('server-log', { type: 'error', text: `Server error: ${err.message}` });
    }
  });
}

function stopApiServer() {
  if (apiServer) { apiServer.close(); apiServer = null; }
}

ipcMain.handle('get-models', () => scanModels());
ipcMain.handle('delete-model', async (_e, modelPath: string) => {
  try {
    if (currentModelPath === modelPath) {
      return { success: false, error: 'Cannot delete active model. Unload it first.' };
    }
    if (fs.existsSync(modelPath)) {
      fs.unlinkSync(modelPath);
      console.log(`[TALOS] Deleted model: ${modelPath}`);
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});
ipcMain.handle('get-model-size', (_e, modelPath: string) => {
  try {
    const stat = fs.statSync(modelPath);
    if (!stat.isDirectory()) return Math.round(stat.size / (1024 * 1024));
    let total = 0;
    function walkDir(dir: string) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walkDir(p);
        else try { total += fs.statSync(p).size; } catch {}
      }
    }
    walkDir(modelPath);
    return Math.round(total / (1024 * 1024));
  }
  catch { return 0; }
});
ipcMain.handle('get-settings', () => getSettings());
ipcMain.handle('get-system-locale', () => app.getLocale());
ipcMain.handle('save-settings', (_e, s) => { saveSettings(s); return true; });
ipcMain.handle('load-model', async (_e, modelPath, config) => {
  console.log(`[TALOS] IPC load-model called with path: ${modelPath}`);

  const s = getSettings();

  const analysis = analyzeModelForAirllm(modelPath);
  if (analysis.needsAirllm) {
    const hw = checkHardwareForModel(analysis);
    if (!hw.sufficient && !s.airllmEnabled) {
      console.log(`[TALOS] Hardware insufficient for ${analysis.modelType} model (${analysis.modelSize}). Auto-activating AirLLM.`);
      saveSettings({ ...s, airllmEnabled: true });
      const airllmInfo = await detectAirllm();
      if (airllmInfo.airllmInstalled) {
        await startAirllmServer(airllmInfo.pythonPath);
      }
      mainWindow?.webContents.send('airllm-auto-activated', {
        modelType: analysis.modelType,
        modelSize: analysis.modelSize,
        reason: analysis.reason,
        ramGB: Math.round(hw.ramGB * 10) / 10,
        vramGB: Math.round(hw.vramGB * 10) / 10,
        neededRAM: hw.neededRAM,
        neededVRAM: hw.neededVRAM,
      });
    }
  }
  if (s.talosEngineBackend === 'talos-engine' || s.talosEngineBackend === 'talos-cli') {
    if (s.talosEngineBackend === 'talos-cli') {
      if (!talosCli || !talosCliReady) {
        try { await startTalosCli(s); } catch (err: any) { return { success: false, error: 'CLI not running: ' + err.message }; }
      }
      try {
        const gpuLayers = s.talosEngineGpuLayers ?? config?.gpuLayers ?? 0;
        const ok = await loadModelViaEngineApi(modelPath, gpuLayers);
        if (ok) {
          s.lastModelPath = modelPath;
          saveSettings(s);
          currentModelPath = modelPath;
          mainWindow?.webContents.send('model-status', { loaded: true, path: modelPath });
          return { success: true };
        }
        return { success: false, error: 'Failed to load model via CLI API' };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    if (!talosEngine || !talosEngineReady) {
      try { await startTalosEngine(s); } catch (err: any) { return { success: false, error: 'Engine not running: ' + err.message }; }
    }
    try {
      const result = await new Promise<any>((resolve) => {
        const gpuLayers = s.talosEngineGpuLayers ?? config?.gpuLayers ?? 0;
        talosEngine!.stdin!.write(JSON.stringify({ action: 'load_model', path: modelPath, params: { n_gpu_layers: gpuLayers } }) + '\n');
        let buffer = '';
        const handler = (data: Buffer) => {
          buffer += data.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            try {
              const resp = JSON.parse(line.trim());
              if (resp.success !== undefined || resp.error) {
                talosEngine!.stdout!.removeListener('data', handler);
                resolve(resp);
              }
            } catch {}
          }
        };
        talosEngine!.stdout!.on('data', handler);
        setTimeout(() => resolve({ success: false, error: 'Timeout loading model' }), 120000);
      });
      if (result.success) {
        s.lastModelPath = modelPath;
        saveSettings(s);
        currentModelPath = modelPath;
        mainWindow?.webContents.send('model-status', { loaded: true, path: modelPath });
      }
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
  try {
    await loadModel(modelPath, config);
    s.lastModelPath = modelPath;
    saveSettings(s);
    return { success: true };
  } catch (err: any) {
    console.error('[TALOS] IPC load-model error:', err.message);
    return { success: false, error: err.message };
  }
});
ipcMain.handle('unload-model', async () => {
  const s = getSettings();
  if (s.talosEngineBackend === 'talos-engine' || s.talosEngineBackend === 'talos-cli') {
    if (s.talosEngineBackend === 'talos-cli') {
      if (talosCli && talosCliReady) {
        await unloadModelViaEngineApi();
      }
    } else if (talosEngine && talosEngineReady) {
      talosEngine.stdin!.write(JSON.stringify({ action: 'unload_model' }) + '\n');
    }
    currentModelPath = '';
    mainWindow?.webContents.send('model-status', { loaded: false, path: '' });
    return true;
  }
  await unloadModel();
  return true;
});
ipcMain.handle('get-model-status', () => {
  const s = getSettings();
  if (s.talosEngineBackend === 'talos-engine' || s.talosEngineBackend === 'talos-cli') {
    return { loaded: !!currentModelPath, path: currentModelPath, name: currentModelPath ? path.basename(currentModelPath) : '' };
  }
  return { loaded: !!currentModel, path: currentModelPath, name: currentModelPath ? path.basename(currentModelPath) : '' };
});
ipcMain.handle('start-server', async (_e, port, apiKey) => {
  startApiServer(port, apiKey);
  return true;
});
ipcMain.handle('stop-server', () => {
  stopApiServer();
  return true;
});
ipcMain.handle('get-server-status', () => ({ running: !!apiServer }));

let currentDownloadRequest: any = null;

ipcMain.handle('cancel-download', () => {
  if (currentDownloadRequest) {
    try {
      currentDownloadRequest.destroy();
    } catch {}
    currentDownloadRequest = null;
    mainWindow?.webContents.send('download-progress', { done: true, cancelled: true });
    return true;
  }
  return false;
});

ipcMain.handle('stop-chat', () => {
  isChatting = false;
  return true;
});

const CONVERSATIONS_PATH = path.join(app.getPath('userData'), 'conversations.enc');

ipcMain.handle('save-conversations', (_e, data: string) => {
  try {
    const buffer = Buffer.from(data, 'utf-8');
    const encrypted = safeStorage.encryptString(buffer.toString('latin1'));
    fs.writeFileSync(CONVERSATIONS_PATH, encrypted);
    return true;
  } catch (err: any) {
    console.error('[TALOS] Save conversations error:', err.message);
    return false;
  }
});

ipcMain.handle('load-conversations', () => {
  try {
    if (!fs.existsSync(CONVERSATIONS_PATH)) return null;
    const encrypted = fs.readFileSync(CONVERSATIONS_PATH);
    const decrypted = safeStorage.decryptString(encrypted);
    return decrypted;
  } catch (err: any) {
    console.error('[TALOS] Load conversations error:', err.message);
    return null;
  }
});

ipcMain.handle('get-hardware-info', () => {
  const cpus = os.cpus();
  const cpu = cpus[0];
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const arch = os.arch();
  const platform = os.platform();
  const cpuModel = cpu?.model?.trim() || 'Unknown';
  const cpuCores = cpus.length;
  const cpuSpeed = cpu?.speed || 0;

  const totalMemGB = +(totalMem / (1024 ** 3)).toFixed(2);
  const usedMemGB = +(usedMem / (1024 ** 3)).toFixed(2);

  let gpuName = 'Não detectado';
  let gpuVramMB = 0;
  let gpuApi = 'N/A';
  try {
    const { execSync } = require('child_process');
    let detected = false;
    try {
      const smi = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits', { encoding: 'utf8', timeout: 5000 });
      const smiLine = smi.trim().split('\n')[0];
      if (smiLine) {
        const parts = smiLine.split(',').map((s: string) => s.trim());
        gpuName = parts[0] || 'GPU';
        gpuVramMB = parseInt(parts[1]) || 0;
        gpuApi = 'CUDA';
        detected = true;
      }
    } catch {}
    if (!detected) {
      try {
        const ps = execSync(`powershell -NoProfile -Command "Get-CimInstance Win32_VideoController | Select-Object -First 1 Name,AdapterRAM,VideoProcessor | ForEach-Object { $_.Name + '|' + $_.AdapterRAM + '|' + $_.VideoProcessor }"`, { encoding: 'utf8', timeout: 5000 });
        const psLine = ps.trim().split('\n').find((l: string) => l.includes('|'));
        if (psLine) {
          const [name, adapterRam, processor] = psLine.split('|').map((s: string) => s.trim());
          const vramRaw = parseInt(adapterRam) || 0;
          gpuVramMB = Math.round(vramRaw / (1024 * 1024));
          gpuName = name || processor || 'GPU';
          if (gpuName && !gpuName.toLowerCase().includes('microsoft') && !gpuName.toLowerCase().includes('basic')) {
            detected = true;
          }
          gpuApi = 'DirectX';
        }
      } catch {}
    }
    if (!detected) {
      try {
        const wmic = execSync('wmic path win32_videocontroller get name,adapterram /format:csv', { encoding: 'utf8', timeout: 5000 });
        const lines = wmic.trim().split('\n').filter((l: string) => l.includes(','));
        if (lines.length > 1) {
          const parts = lines[1].split(',');
          const vramRaw = parseInt(parts[1]) || 0;
          gpuVramMB = Math.round(vramRaw / (1024 * 1024));
          gpuName = (parts[2] || '').trim();
          gpuApi = 'DirectX';
          detected = true;
        }
      } catch {}
    }
    if (!detected) {
      try {
        const setupdi = execSync('powershell -NoProfile -Command "Get-PnpDevice -Class Display -Status OK | Select-Object -First 1 FriendlyName | ForEach-Object { $_.FriendlyName }"', { encoding: 'utf8', timeout: 5000 });
        const devName = setupdi.trim();
        if (devName && devName.length > 0 && !devName.includes('Get-PnpDevice')) {
          gpuName = devName;
          gpuApi = 'DirectX';
          detected = true;
        }
      } catch {}
    }
  } catch {}

  return {
    cpu: {
      name: cpuModel,
      architecture: arch,
      platform: platform,
      cores: cpuCores,
      speed: cpuSpeed,
      compatible: true,
      avx: true,
      avx2: true,
    },
    memory: {
      total: totalMemGB,
      used: usedMemGB,
      totalFormatted: totalMemGB + ' GB',
      usedFormatted: usedMemGB + ' GB',
      freeFormatted: ((totalMem - usedMem) / (1024 ** 3)).toFixed(2) + ' GB',
      totalBytes: totalMem,
      usedBytes: usedMem,
    },
    gpu: {
      detected: gpuVramMB > 0,
      name: gpuName,
      vramMB: gpuVramMB,
      vramFormatted: gpuVramMB > 0 ? gpuVramMB + ' MB' : '0 MB',
      api: gpuApi,
    },
  };
});

ipcMain.handle('hf-search-models', async (_e, query: string, sort: string = 'downloads', limit: number = 30) => {
  try {
    const https = await import('https');
    const params = new URLSearchParams({
      search: query,
      sort,
      direction: '-1',
      limit: String(limit),
    });
    const url = `https://huggingface.co/api/models?${params}`;
    const data = await new Promise<any>((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'TalosLLMStudio/1.0' } }, (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => body += chunk.toString());
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch { reject(new Error('Invalid JSON')); }
        });
        res.on('error', reject);
      }).on('error', reject);
    });
    return data;
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('hf-model-details', async (_e, modelId: string) => {
  try {
    const https = await import('https');
    const url = `https://huggingface.co/api/models/${modelId}`;
    const data = await new Promise<any>((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'TalosLLMStudio/1.0' } }, (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => body += chunk.toString());
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch { reject(new Error('Invalid JSON')); }
        });
        res.on('error', reject);
      }).on('error', reject);
    });
    return data;
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('hf-model-files', async (_e, modelId: string) => {
  try {
    const https = await import('https');
    async function fetchTree(subdir: string): Promise<any[]> {
      const treePath = subdir ? `main/${subdir}` : 'main';
      const url = `https://huggingface.co/api/models/${modelId}/tree/${treePath}`;
      return new Promise<any[]>((resolve) => {
        https.get(url, { headers: { 'User-Agent': 'TalosLLMStudio/1.0' } }, (res) => {
          let body = '';
          res.on('data', (chunk: Buffer) => body += chunk.toString());
          res.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch { resolve([]); }
          });
          res.on('error', () => resolve([]));
        }).on('error', () => resolve([]));
      });
    }

    const ggufFiles: any[] = [];

    const rootFiles = await fetchTree('');
    for (const file of rootFiles) {
      if (file.path && file.path.endsWith('.gguf')) {
        ggufFiles.push(file);
      }
    }

    if (ggufFiles.length === 0) {
      const subdirs = rootFiles.filter((f: any) => f.type === 'directory').map((d: any) => d.path);
      for (const subdir of subdirs.slice(0, 5)) {
        const subFiles = await fetchTree(subdir);
        for (const file of subFiles) {
          if (file.path && file.path.endsWith('.gguf')) {
            ggufFiles.push({ ...file, path: `${subdir}/${file.path}` });
          }
        }
      }
    }

    if (ggufFiles.length === 0) {
      for (const subdir of ['gguf', 'quantizations']) {
        const subFiles = await fetchTree(subdir);
        for (const file of subFiles) {
          if (file.path && file.path.endsWith('.gguf')) {
            ggufFiles.push({ ...file, path: `${subdir}/${file.path}` });
          }
        }
      }
    }

    return ggufFiles;
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('download-model', async (_e, url: string, filename: string, modelId: string) => {
  try {
    const https = await import('https');
    const http = await import('http');
    const modelDir = path.join(getModelsDir(getSettings()), modelId.replace('/', '_'));
    ensureDir(modelDir);
    const filePath = path.join(modelDir, filename);
    const proto = url.startsWith('https') ? https : http;
    await new Promise<void>((resolve, reject) => {
      currentDownloadRequest = proto.get(url, { headers: { 'User-Agent': 'TalosLLMStudio/1.0' } }, (response: any) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          currentDownloadRequest = proto.get(response.headers.location, (res2: any) => {
            if (res2.statusCode !== 200) { reject(new Error(`HTTP ${res2.statusCode}`)); return; }
            const totalBytes = parseInt(res2.headers['content-length'] || '0', 10);
            let downloadedBytes = 0;
            const file = fs.createWriteStream(filePath);
            res2.on('data', (chunk: Buffer) => {
              downloadedBytes += chunk.length;
              mainWindow?.webContents.send('download-progress', {
                modelId,
                filename,
                downloaded: downloadedBytes,
                total: totalBytes,
                percent: totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0,
              });
            });
            res2.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
            file.on('error', reject);
          }).on('error', reject);
          return;
        }
        if (response.statusCode !== 200) { reject(new Error(`HTTP ${response.statusCode}`)); return; }
        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        const file = fs.createWriteStream(filePath);
        response.on('data', (chunk: Buffer) => {
          downloadedBytes += chunk.length;
          mainWindow?.webContents.send('download-progress', {
            modelId,
            filename,
            downloaded: downloadedBytes,
            total: totalBytes,
            percent: totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0,
          });
        });
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
        file.on('error', reject);
      });
      currentDownloadRequest.on('error', (err: any) => {
        if (err.code === 'ECONNRESET' || err.message?.includes('destroyed')) {
          currentDownloadRequest = null;
          return;
        }
        currentDownloadRequest = null;
        reject(err);
      });
      currentDownloadRequest.on('close', () => {
        if (currentDownloadRequest && !currentDownloadRequest.destroyed) return;
        currentDownloadRequest = null;
      });
      currentDownloadRequest.setTimeout(300000, () => { currentDownloadRequest.destroy(); currentDownloadRequest = null; reject(new Error('Download timeout')); });
    });
    mainWindow?.webContents.send('download-progress', {
      modelId,
      filename,
      downloaded: 0,
      total: 0,
      percent: 100,
      done: true,
    });
    return { success: true, path: filePath };
  } catch (err: any) {
    mainWindow?.webContents.send('download-progress', { error: err.message, done: true });
    return { success: false, error: err.message };
  }
});

ipcMain.handle('set-system-prompt', (_e, prompt: string) => {
  serverSystemPrompt = prompt;
  return { success: true };
});

ipcMain.handle('select-folder', async () => {
  const { dialog } = await import('electron');
  if (!mainWindow) return { path: null };
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (result.canceled || result.filePaths.length === 0) return { path: null };
  return { path: result.filePaths[0] };
});

ipcMain.handle('open-external', async (event, url: string) => {
  const { shell } = await import('electron');
  await shell.openExternal(url);
});

ipcMain.handle('select-files', async () => {
  const { dialog } = await import('electron');
  if (!mainWindow) return { paths: [] };
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return { paths: [] };
  return { paths: result.filePaths };
});

ipcMain.handle('chat-completion', async (event, messages, config) => {
  console.log('[TALOS] chat-completion called, messages:', messages.length);
  const s = getSettings();

  if (s.talosEngineBackend === 'talos-engine' || s.talosEngineBackend === 'talos-cli') {
    if (!talosEngine || !talosEngineReady) {
      if (s.talosEngineAutoStart) {
        try { await startTalosEngine(s); } catch (err: any) { throw new Error('Engine not running: ' + err.message); }
      } else {
        throw new Error('Talos Engine not running');
      }
    }
    if (isChatting) throw new Error('Already generating');
    isChatting = true;
    try {
      const result = await talosEngineChat(messages, {
        temperature: config?.temperature || 0.7,
        num_predict: config?.max_tokens || 2048,
      });
      event.sender.send('chat-token', result);
      return { text: result, tokens: result.length };
    } catch (err: any) {
      mainWindow?.webContents.send('chat-error', err.message);
      throw err;
    } finally {
      isChatting = false;
    }
  }

  if (!currentModel) throw new Error('No model loaded');
  if (isChatting) throw new Error('Already generating');
  isChatting = true;
  try {
    if (currentContext) {
      try { currentContext.dispose(); } catch {}
    }
    currentContext = await currentModel.createContext();
    const seq = currentContext.getSequence();

    let systemMsg = messages.find((m: any) => m.role === 'system');
    if (!systemMsg && serverSystemPrompt) {
      systemMsg = { role: 'system', content: serverSystemPrompt };
    }
    const userMessages = messages.filter((m: any) => m.role !== 'system');

    let fullContext = '';
    if (systemMsg) {
      fullContext += `<|system|>\n${systemMsg.content} <|end|>\n`;
    }
    for (const msg of userMessages) {
      if (msg.isUser) {
        fullContext += `<|user|>\n${msg.text} <|end|>\n`;
      } else {
        fullContext += `<|assistant|>\n${msg.text} <|end|>\n`;
      }
    }
    fullContext += `<|assistant|>\n`;

    let fullText = '';
    try {
      const tokens = currentModel.tokenize(fullContext);
      console.log('[TALOS] Tokens count:', tokens.length);
      console.log('[TALOS] Context size:', currentContext.contextSize);

      let tokenCount = 0;
      let lastText = '';
      for await (const token of seq.evaluate(tokens, {
        maxTokens: config?.max_tokens || 2048,
        temperature: config?.temperature || 0.7,
      })) {
        tokenCount++;
        const raw = currentModel.detokenize([token]);
        const text = raw || '';
        if (text.includes('<|end|>') || text.includes('<|') || text.includes('User:') || text.includes('Assistant:')) {
          break;
        }
        if (text && text !== 'undefined' && text.trim()) {
          fullText += text;
          event.sender.send('chat-token', text);
        }
        if (tokenCount >= (config?.max_tokens || 2048)) break;
        if (fullText === lastText && tokenCount > 5) break;
        lastText = fullText;
      }
      console.log('[TALOS] Generated tokens:', tokenCount);
    } catch (evalErr: any) {
      console.error('[TALOS] evaluate error:', evalErr.message);
      throw evalErr;
    }

    return { text: fullText, tokens: fullText.length };
  } catch (err: any) {
    mainWindow?.webContents.send('chat-error', err.message);
    throw err;
  } finally {
    isChatting = false;
  }
});

// Talos Engine IPC handlers
ipcMain.handle('start-engine', async (_e, settings?: any) => {
  const s = settings || getSettings();
  try {
    if (s.talosEngineBackend === 'talos-cli') {
      await startTalosCli(s);
      return { success: true, running: talosCliReady };
    }
    await startTalosEngine(s);
    return { success: true, running: talosEngineReady };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('stop-engine', () => {
  const s = getSettings();
  if (s.talosEngineBackend === 'talos-cli') {
    stopTalosCli();
  } else {
    stopTalosEngine();
  }
  return { success: true };
});

ipcMain.handle('get-engine-status', () => {
  const s = getSettings();
  if (s.talosEngineBackend === 'talos-cli') {
    return { running: !!talosCli, ready: talosCliReady, port: talosEnginePort };
  }
  return {
    running: !!talosEngine,
    ready: talosEngineReady,
    port: talosEnginePort,
  };
});

ipcMain.handle('engine-chat', async (_e, messages: any[], options?: any) => {
  try {
    const s = getSettings();
    if (s.talosEngineBackend === 'talos-cli') {
      if (!talosCli || !talosCliReady) {
        if (s.talosEngineAutoStart) {
          await startTalosCli(s);
        } else {
          throw new Error('CLI not running');
        }
      }
      const result = await talosEngineChat(messages, options || {});
      return { success: true, response: result };
    } else {
      if (!talosEngine || !talosEngineReady) {
        if (s.talosEngineAutoStart) {
          await startTalosEngine(s);
        } else {
          throw new Error('Engine not running');
        }
      }
      const result = await talosEngineChat(messages, options || {});
      return { success: true, response: result };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('engine-load-model', async (_e, modelPath: string, gpuLayers?: number) => {
  const s = getSettings();
  if (s.talosEngineBackend === 'talos-cli') {
    if (!talosCli || !talosCliReady) {
      return { success: false, error: 'CLI not running' };
    }
    const ok = await loadModelViaEngineApi(modelPath, gpuLayers || 0);
    return { success: ok };
  }
  if (!talosEngine || !talosEngineReady) {
    return { success: false, error: 'Engine not running' };
  }
  return new Promise((resolve) => {
    const port = talosEnginePort;
    const http = require('http');
    const cmd = { action: 'load_model', path: modelPath, params: { n_gpu_layers: gpuLayers || 0 } };
    talosEngine!.stdin!.write(JSON.stringify(cmd) + '\n');

    let buffer = '';
    talosEngine!.stdout!.on('data', function handler(data: Buffer) {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        try {
          const resp = JSON.parse(line.trim());
          if (resp.success !== undefined || resp.error) {
            talosEngine!.stdout!.removeListener('data', handler);
            resolve(resp);
          }
        } catch {}
      }
    });

    setTimeout(() => {
      resolve({ success: false, error: 'Timeout' });
    }, 120000);
  });
});

ipcMain.handle('engine-unload-model', async () => {
  const s = getSettings();
  if (s.talosEngineBackend === 'talos-cli') {
    if (!talosCli || !talosCliReady) {
      return { success: false, error: 'CLI not running' };
    }
    await unloadModelViaEngineApi();
    return { success: true };
  }
  if (!talosEngine || !talosEngineReady) {
    return { success: false, error: 'Engine not running' };
  }
  return new Promise((resolve) => {
    talosEngine!.stdin!.write(JSON.stringify({ action: 'unload_model' }) + '\n');

    let buffer = '';
    talosEngine!.stdout!.on('data', function handler(data: Buffer) {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        try {
          const resp = JSON.parse(line.trim());
          if (resp.success !== undefined || resp.error) {
            talosEngine!.stdout!.removeListener('data', handler);
            resolve(resp);
          }
        } catch {}
      }
    });

    setTimeout(() => {
      resolve({ success: false, error: 'Timeout' });
    }, 10000);
  });
});

app.whenReady().then(async () => {
  const settings = getSettings();
  ensureDir(getModelsDir(settings));

  createWindow();

  detectAirllm().then(async (info) => {
    if (info.pythonFound && !info.airllmInstalled) {
      console.log('[AirLLM] Auto-installing...');
      const result = await installAirllm(info.pythonPath);
      if (result.success) console.log('[AirLLM] Installed successfully');
      else console.log('[AirLLM] Auto-install failed:', result.error);
    } else if (info.airllmInstalled) {
      console.log('[AirLLM] Already installed (v' + info.airllmVersion + ')');
    } else {
      console.log('[AirLLM] Python not found, skipping install');
    }
  });

  detectImageGenDeps().then(async (deps) => {
    console.log('[ImageGen] Deps check:', JSON.stringify(deps));
    if (deps.pythonFound && deps.torchInstalled && deps.diffusersInstalled) {
      console.log('[ImageGen] Dependencies found, starting server...');
      const result = await startImageGenServer(deps.pythonPath);
      if (result.success) console.log('[ImageGen] Server started on port ' + result.port);
      else console.log('[ImageGen] Failed to start:', result.error);
    } else {
      console.log('[ImageGen] Missing deps - Python:', deps.pythonFound, 'torch:', deps.torchInstalled, 'diffusers:', deps.diffusersInstalled);
    }
  });
});

// ==================== AIRLLM ====================
let airllmServerProcess: any = null;

async function detectAirllm(): Promise<{ pythonFound: boolean; pythonPath: string; airllmInstalled: boolean; airllmVersion: string }> {
  const pythons = ['py -3.11', 'py -3', 'python3', 'python', '"C:\\Users\\guilh\\AppData\\Local\\Programs\\Python\\Python311\\python.exe"'];
  let pythonPath = '';
  for (const py of pythons) {
    try {
      const result = await new Promise<string>((resolve) => {
        const proc = spawn(py, ['--version'], { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
        let out = '';
        proc.stdout.on('data', (d: Buffer) => out += d.toString());
        proc.stderr.on('data', (d: Buffer) => out += d.toString());
        proc.on('close', () => resolve(out.trim()));
        proc.on('error', () => resolve(''));
        setTimeout(() => { try { proc.kill(); } catch {} resolve(''); }, 3000);
      });
      if (result.includes('Python')) {
        pythonPath = py;
        break;
      }
    } catch {}
  }

  if (!pythonPath) {
    return { pythonFound: false, pythonPath: '', airllmInstalled: false, airllmVersion: '' };
  }

  try {
    const result = await new Promise<string>((resolve) => {
      const proc = spawn(pythonPath, ['-m', 'pip', 'show', 'airllm'], { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
      let out = '';
      proc.stdout.on('data', (d: Buffer) => out += d.toString());
      proc.stderr.on('data', (d: Buffer) => out += d.toString());
      proc.on('close', () => resolve(out.trim()));
      proc.on('error', () => resolve(''));
      setTimeout(() => { try { proc.kill(); } catch {} resolve(''); }, 5000);
    });
    const versionMatch = result.match(/Version:\s*(.+)/);
    return {
      pythonFound: true,
      pythonPath,
      airllmInstalled: result.includes('Name: airllm'),
      airllmVersion: versionMatch ? versionMatch[1].trim() : ''
    };
  } catch {
    return { pythonFound: true, pythonPath, airllmInstalled: false, airllmVersion: '' };
  }
}

async function installAirllm(pythonPath: string): Promise<{ success: boolean; error: string }> {
  return new Promise((resolve) => {
    const proc = spawn(pythonPath, ['-m', 'pip', 'install', 'airllm[flash_attn]'], { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let err = '';
    proc.stdout.on('data', (d: Buffer) => { /* progress */ });
    proc.stderr.on('data', (d: Buffer) => err += d.toString());
    proc.on('close', (code) => resolve({ success: code === 0, error: code !== 0 ? err : '' }));
    proc.on('error', (e) => resolve({ success: false, error: e.message }));
    setTimeout(() => { try { proc.kill(); } catch {} resolve({ success: false, error: 'Timeout after 120s' }); }, 120000);
  });
}

function startAirllmServer(pythonPath: string): Promise<{ success: boolean; port: number; error: string }> {
  return new Promise((resolve) => {
    if (airllmServerProcess) {
      try { airllmServerProcess.kill(); } catch {}
      airllmServerProcess = null;
    }
    const scriptPath = path.join(app.getAppPath(), 'engine', 'airllm_server.py');
    if (!fs.existsSync(scriptPath)) {
      return resolve({ success: false, port: 0, error: `Script not found: ${scriptPath}` });
    }
    const port = 11436;
    airllmServerProcess = spawn(pythonPath, [scriptPath, '--port', String(port)], {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let started = false;
    airllmServerProcess.stdout.on('data', (d: Buffer) => {
      const line = d.toString();
      if (line.includes('READY') && !started) {
        started = true;
        resolve({ success: true, port, error: '' });
      }
    });
    airllmServerProcess.stderr.on('data', (d: Buffer) => {
      const line = d.toString();
      if (line.includes('READY') && !started) {
        started = true;
        resolve({ success: true, port, error: '' });
      }
    });
    airllmServerProcess.on('close', () => {
      airllmServerProcess = null;
    });
    airllmServerProcess.on('error', (e: any) => {
      resolve({ success: false, port: 0, error: e.message });
    });
    setTimeout(() => {
      if (!started) resolve({ success: false, port: 0, error: 'AirLLM server did not start in time' });
    }, 30000);
  });
}

function stopAirllmServer() {
  if (airllmServerProcess) {
    try { airllmServerProcess.kill(); } catch {}
    airllmServerProcess = null;
  }
}

ipcMain.handle('get-airllm-status', async () => {
  return await detectAirllm();
});

ipcMain.handle('install-airllm', async () => {
  const info = await detectAirllm();
  if (!info.pythonFound) return { success: false, error: 'Python not found' };
  return await installAirllm(info.pythonPath);
});

ipcMain.handle('start-airllm-server', async () => {
  const info = await detectAirllm();
  if (!info.airllmInstalled) return { success: false, error: 'AirLLM not installed' };
  return await startAirllmServer(info.pythonPath);
});

ipcMain.handle('stop-airllm-server', () => {
  stopAirllmServer();
  return { success: true };
});

ipcMain.handle('airllm-generate', async (_e, { prompt, modelPath, maxTokens }: { prompt: string; modelPath?: string; maxTokens?: number }) => {
  try {
    const settings = getSettings();
    const port = 11436;
    const resp = await fetch(`http://127.0.0.1:${port}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model_path: modelPath, max_tokens: maxTokens || 512 })
    });
    const data = await resp.json();
    return data;
  } catch (err: any) {
    return { error: err.message };
  }
});

// ==================== IMAGE GENERATION ====================
let imageGenProcess: any = null;

async function detectImageGenDeps(): Promise<{ pythonFound: boolean; pythonPath: string; torchInstalled: boolean; diffusersInstalled: boolean }> {
  const pythons = [
    '"C:\\Users\\guilh\\AppData\\Local\\Programs\\Python\\Python311\\python.exe"',
    'C:\\Users\\guilh\\AppData\\Local\\Programs\\Python\\Python311\\python.exe',
    'py -3.11', 'py -3', 'python3', 'python',
  ];
  let pythonPath = '';
  for (const py of pythons) {
    try {
      const result = await new Promise<string>((resolve) => {
        const proc = spawn(py, ['--version'], { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
        let out = '';
        proc.stdout.on('data', (d: Buffer) => out += d.toString());
        proc.stderr.on('data', (d: Buffer) => out += d.toString());
        proc.on('close', () => resolve(out.trim()));
        proc.on('error', () => resolve(''));
        setTimeout(() => { try { proc.kill(); } catch {} resolve(''); }, 5000);
      });
      console.log(`[TALOS] detectImageGenDeps: '${py}' => '${result}'`);
      if (result.includes('Python')) { pythonPath = py; break; }
    } catch {}
  }
  console.log(`[TALOS] detectImageGenDeps: pythonPath='${pythonPath}'`);
  if (!pythonPath) return { pythonFound: false, pythonPath: '', torchInstalled: false, diffusersInstalled: false };

  const runCheck = (code: string): Promise<string> => new Promise<string>((resolve) => {
    const cleanPath = pythonPath.replace(/^"|"$/g, '');
    const proc = spawn(cleanPath, ['-c', code], { shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    proc.stdout.on('data', (d: Buffer) => out += d.toString());
    proc.stderr.on('data', (d: Buffer) => out += d.toString());
    proc.on('close', () => resolve(out.trim()));
    proc.on('error', () => resolve(''));
    setTimeout(() => { try { proc.kill(); } catch {} resolve(''); }, 10000);
  });

  const torchResult = await runCheck('import torch; print(torch.__version__)');
  console.log(`[TALOS] detectImageGenDeps: torch check => '${torchResult}'`);
  const torchOk = torchResult.length > 0 && !torchResult.includes('Error') && !torchResult.includes('No module');

  const diffusersResult = await runCheck('import diffusers; print(diffusers.__version__)');
  console.log(`[TALOS] detectImageGenDeps: diffusers check => '${diffusersResult}'`);
  const diffusersOk = diffusersResult.length > 0 && !diffusersResult.includes('Error') && !diffusersResult.includes('No module');

  return { pythonFound: true, pythonPath, torchInstalled: torchOk, diffusersInstalled: diffusersOk };
}

function startImageGenServer(pythonPath: string): Promise<{ success: boolean; port: number; error: string }> {
  return new Promise((resolve) => {
    if (imageGenProcess) { try { imageGenProcess.kill(); } catch {} imageGenProcess = null; }
    const appPath = app.getAppPath();
    const scriptPath = path.join(appPath, 'engine', 'image_gen.py');
    console.log(`[TALOS] startImageGenServer: appPath=${appPath}, scriptPath=${scriptPath}, exists=${fs.existsSync(scriptPath)}`);
    if (!fs.existsSync(scriptPath)) return resolve({ success: false, port: 0, error: `Script not found: ${scriptPath}` });
    const port = 11437;
    console.log(`[TALOS] startImageGenServer: spawning ${pythonPath} ${scriptPath}`);
    const cleanPath = pythonPath.replace(/^"|"$/g, '');
    imageGenProcess = spawn(cleanPath, [scriptPath, '--port', String(port)], { shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    let started = false;
    imageGenProcess.stdout.on('data', (d: Buffer) => {
      const msg = d.toString();
      console.log(`[TALOS] imageGen stdout: ${msg.trim()}`);
      if (msg.includes('READY') && !started) { started = true; resolve({ success: true, port, error: '' }); }
    });
    imageGenProcess.stderr.on('data', (d: Buffer) => {
      const msg = d.toString();
      console.log(`[TALOS] imageGen stderr: ${msg.trim()}`);
      if (msg.includes('READY') && !started) { started = true; resolve({ success: true, port, error: '' }); }
    });
    imageGenProcess.on('error', (e: any) => {
      console.log(`[TALOS] imageGen error: ${e.message}`);
      if (!started) resolve({ success: false, port: 0, error: e.message });
    });
    imageGenProcess.on('close', (code: any) => {
      console.log(`[TALOS] imageGen closed with code ${code}`);
      imageGenProcess = null;
    });
    setTimeout(() => { if (!started) resolve({ success: false, port: 0, error: 'Image gen server did not start in time' }); }, 30000);
  });
}

function stopImageGenServer() {
  if (imageGenProcess) { try { imageGenProcess.kill(); } catch {} imageGenProcess = null; }
}

async function imageGenRequest(endpoint: string, body: any): Promise<any> {
  const port = 11437;

  if (!imageGenProcess) {
    console.log(`[TALOS] imageGenRequest: server not running, auto-starting...`);
    const deps = await detectImageGenDeps();
    if (deps.pythonFound && deps.torchInstalled && deps.diffusersInstalled) {
      const startResult = await startImageGenServer(deps.pythonPath);
      console.log(`[TALOS] imageGenRequest: start result:`, startResult);
      if (!startResult.success) return { error: 'Image gen server failed to start: ' + startResult.error };
    } else {
      return { error: `Image gen deps missing: python=${deps.pythonFound} torch=${deps.torchInstalled} diffusers=${deps.diffusersInstalled}` };
    }
  }

  const resp = await fetch(`http://127.0.0.1:${port}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return await resp.json();
}

ipcMain.handle('get-imagegen-status', async () => {
  const deps = await detectImageGenDeps();
  let serverRunning = false;
  try {
    const r = await fetch('http://127.0.0.1:11437/health');
    const data = await r.json();
    serverRunning = data.status === 'ready';
  } catch {}
  return { ...deps, serverRunning };
});

ipcMain.handle('start-imagegen-server', async () => {
  const deps = await detectImageGenDeps();
  if (!deps.pythonFound) return { success: false, error: 'Python not found' };
  return await startImageGenServer(deps.pythonPath);
});

ipcMain.handle('stop-imagegen-server', () => {
  stopImageGenServer();
  return { success: true };
});

ipcMain.handle('imagegen-load-model', async (_e, { model, lowRam }: { model: string; lowRam?: boolean }) => {
  return await imageGenRequest('/load', { model, low_ram: lowRam || false });
});

ipcMain.handle('imagegen-unload-model', async () => {
  return await imageGenRequest('/unload', {});
});

ipcMain.handle('imagegen-generate', async (_e, { prompt, negativePrompt, width, height, steps, guidanceScale, seed, format }: any) => {
  return await imageGenRequest('/generate', {
    prompt, negative_prompt: negativePrompt, width, height,
    steps, guidance_scale: guidanceScale, seed, format,
  });
});

ipcMain.handle('imagegen-models', async () => {
  try {
    const r = await fetch('http://127.0.0.1:11437/models');
    return await r.json();
  } catch { return { models: [] }; }
});

ipcMain.handle('get-installed-imagegen-models', () => {
  const dirs = [
    getModelsDir(getSettings()),
    path.join(app.getAppPath(), 'models'),
    path.join(path.dirname(app.getPath('exe')), '..', 'models'),
    path.join(path.dirname(app.getPath('exe')), '..', '..', 'models'),
  ];
  const installed: { id: string; name: string; path: string }[] = [];
  const seen = new Set<string>();
  const known: Record<string, string> = {
    'sd-1.5': 'Stable Diffusion 1.5',
    'sd-2.1': 'Stable Diffusion 2.1',
    'sdxl': 'SDXL',
    'flux-schnell': 'FLUX Schnell',
    'flux-dev': 'FLUX Dev',
  };
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (seen.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (fs.existsSync(path.join(full, 'model_index.json'))) {
        seen.add(entry.name);
        const id = entry.name.toLowerCase().replace(/[^a-z0-9.-]/g, '');
        let matchKey = '';
        for (const k of Object.keys(known)) {
          if (id.includes(k) || id.includes(k.replace('.', ''))) { matchKey = k; break; }
        }
        installed.push({ id: matchKey || id, name: known[matchKey] || entry.name, path: full });
      }
    }
  }
  console.log(`[TALOS] Installed image gen models:`, installed.map(m => m.id));
  return installed;
});

ipcMain.handle('check-engine-updates', async () => {
  const results: Record<string, { current: string; latest: string; hasUpdate: boolean; error?: string }> = {};

  // Check AirLLM via PyPI
  try {
    const https = require('https');
    const airllmVersion = await new Promise<string>((resolve) => {
      https.get('https://pypi.org/pypi/airllm/json', (res: any) => {
        let data = '';
        res.on('data', (chunk: any) => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data).info.version); } catch { resolve(''); }
        });
      }).on('error', () => resolve(''));
    });
    results.airllm = {
      current: airllmStatus?.airllmVersion || '0.0.0',
      latest: airllmVersion || 'unknown',
      hasUpdate: airllmVersion && airllmVersion !== (airllmStatus?.airllmVersion || '0.0.0')
    };
  } catch (e: any) {
    results.airllm = { current: '0.0.0', latest: 'error', hasUpdate: false, error: e.message };
  }

  // Check Talos Engine / CLI (local version file or GitHub if configured)
  // For now, mark as manual check
  results['talos-engine'] = { current: '1.0.0', latest: 'manual', hasUpdate: false, error: 'Verificar no repositório do projeto' };
  results['talos-cli'] = { current: '1.0.0', latest: 'manual', hasUpdate: false, error: 'Verificar no repositório do projeto' };
  results.cpu = { current: '2.23.1', latest: 'manual', hasUpdate: false, error: 'Verificar releases llama.cpp' };
  results.vulkan = { current: '2.23.1', latest: 'manual', hasUpdate: false, error: 'Verificar releases llama.cpp' };
  results.cuda = { current: '2.23.1', latest: 'manual', hasUpdate: false, error: 'Verificar releases llama.cpp' };

  return results;
});

app.on('window-all-closed', () => {
  if (currentContext) {
    try { currentContext.dispose(); } catch {}
  }
  if (currentModel) {
    try { currentModel.dispose(); } catch {}
  }
  stopTalosEngine();
  stopApiServer();
  app.quit();
});
