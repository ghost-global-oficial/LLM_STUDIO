import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TextInput, TouchableOpacity, Alert, Platform, Modal } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Server, Shield, Globe, Cpu, Square, Copy, RefreshCw, Settings, Plus, Trash2, ChevronRight, X, Wifi } from 'lucide-react-native';
import httpbridge from 'react-native-http-bridge-refurbished';
import { initLlama, LlamaContext } from 'llama.rn';
import RNFS from 'react-native-fs';
import { useTheme } from '../context/ThemeContext';

const MODELS_DIR = `${RNFS.DocumentDirectoryPath}/models/`;
const CONFIG_FILE = `${RNFS.DocumentDirectoryPath}server_config.json`;

interface HardwareConfig {
  threads: string;
  nCtx: string;
  gpuLayers: string;
  useMlock: boolean;
}

interface ModelInstance {
  id: string;
  name: string;
  uri: string;
  status: 'idle' | 'loading' | 'active' | 'error';
  hardware: HardwareConfig;
}

interface ServerConfig {
  port: string;
  apiKey: string;
  manualIp: string;
  isManualIpEnabled: boolean;
  modelsConfig: { [fileName: string]: HardwareConfig };
}

const DEFAULT_HARDWARE: HardwareConfig = { threads: '4', nCtx: '4096', gpuLayers: '0', useMlock: false };

export default function ServerScreen() {
  const { isDark } = useTheme();
  const [isServerActive, setIsServerActive] = useState(false);
  const [port, setPort] = useState('1234');
  const [apiKey, setApiKey] = useState('lm-studio-v1-key-secret');
  const [ipAddress, setIpAddress] = useState('0.0.0.0');
  const [manualIp, setManualIp] = useState('');
  const [isManualIpEnabled, setIsManualIpEnabled] = useState(false);
  const [activeModels, setActiveModels] = useState<ModelInstance[]>([]);
  const [logs, setLogs] = useState<{text: string, color?: string}[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [availableFiles, setAvailableFiles] = useState<{ name: string, path: string }[]>([]);
  const [isFilePickerVisible, setIsFilePickerVisible] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const llamaContexts = useRef<{ [key: string]: LlamaContext }>({});
  const activeModelsRef = useRef(activeModels);
  activeModelsRef.current = activeModels;
  const apiKeyRef = useRef(apiKey);
  apiKeyRef.current = apiKey;
  const configLoadedRef = useRef(false);

  const detectIp = async () => {
    try {
      const { NetworkInfo } = require('react-native-network-info');

      const wifiIP = await Promise.race([
        NetworkInfo.getWIFIIPV4Address(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
      if (wifiIP && wifiIP !== '0.0.0.0' && !wifiIP.startsWith('127.')) {
        setIpAddress(wifiIP);
        addLog(`IP WiFi detectado: ${wifiIP}`);
        return;
      }

      const ip = await Promise.race([
        NetworkInfo.getIPV4Address(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
      if (ip && ip !== '0.0.0.0' && !ip.startsWith('127.') && ip !== wifiIP) {
        setIpAddress(ip);
        addLog(`IP geral detectado: ${ip}`);
        addLog(`⚠️ IP pode não ser acessível na LAN. Use IP Manual se necessário.`);
        return;
      }
    } catch (e: any) {
      addLog(`Detecção de IP falhou: ${e.message}`);
    }

    setIpAddress('0.0.0.0');
    addLog("IP local não detectado. Ative IP Manual e insira o IP da sua rede WiFi.");
    setIsManualIpEnabled(true);
  };

  const logRef = useRef<any>(null);

  const addLog = (msg: string, color?: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { text: `[${time}] ${msg}`, color }].slice(-100));
  };

  const generateNewKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'lm-';
    for (let i = 0; i < 16; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    setApiKey(result);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setString(text);
      setCopiedField(label);
      addLog(`Copiado: ${label}`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      addLog("Erro ao copiar");
    }
  };

  const modelsConfigFile = `${RNFS.DocumentDirectoryPath}models_config.json`;
  const activeModelsFile = `${RNFS.DocumentDirectoryPath}active_models.json`;

  const loadConfig = async () => {
    try {
      const exists = await RNFS.exists(CONFIG_FILE);
      if (exists) {
        const raw = await RNFS.readFile(CONFIG_FILE, 'utf8');
        const cfg: ServerConfig = JSON.parse(raw);
        if (cfg.port) setPort(cfg.port);
        if (cfg.apiKey) setApiKey(cfg.apiKey);
        if (cfg.manualIp) setManualIp(cfg.manualIp);
        if (cfg.isManualIpEnabled !== undefined) setIsManualIpEnabled(cfg.isManualIpEnabled);
        addLog("Configurações carregadas.");
      }
    } catch {}
    try {
      const exists = await RNFS.exists(activeModelsFile);
      if (exists) {
        const raw = await RNFS.readFile(activeModelsFile, 'utf8');
        const saved: ModelInstance[] = JSON.parse(raw);
        const restored = saved.map(m => ({ ...m, status: 'idle' as const }));
        if (restored.length > 0) {
          setActiveModels(restored);
          addLog(`Modelos restaurados: ${restored.length}`);
        }
      }
    } catch {}
    configLoadedRef.current = true;
  };

  const saveConfig = async () => {
    if (!configLoadedRef.current) return;
    try {
      const cfg: ServerConfig = { port, apiKey, manualIp, isManualIpEnabled, modelsConfig: {} };
      await RNFS.writeFile(CONFIG_FILE, JSON.stringify(cfg), 'utf8');
    } catch {}
  };

  const saveModels = async () => {
    if (!configLoadedRef.current) return;
    try {
      const toSave = activeModelsRef.current.map(m => ({
        id: m.id,
        name: m.name,
        uri: m.uri,
        hardware: m.hardware,
      }));
      await RNFS.writeFile(activeModelsFile, JSON.stringify(toSave), 'utf8');
    } catch {}
  };

  useEffect(() => { saveConfig(); }, [port, apiKey, manualIp, isManualIpEnabled]);
  useEffect(() => { saveModels(); }, [activeModels]);

  const scanModels = async () => {
    try {
      const exists = await RNFS.exists(MODELS_DIR);
      if (!exists) {
        await RNFS.mkdir(MODELS_DIR);
        return;
      }
      const ggufFiles: { name: string, path: string }[] = [];
      const scanDir = async (dirPath: string) => {
        const entries = await RNFS.readDir(dirPath);
        for (const entry of entries) {
          if (entry.isDirectory()) {
            await scanDir(entry.path);
          } else if (entry.name.endsWith('.gguf')) {
            ggufFiles.push({ name: entry.name, path: entry.path });
          }
        }
      };
      await scanDir(MODELS_DIR);
      setAvailableFiles(ggufFiles);
    } catch (e: any) {
      addLog(`Erro ao escanear modelos: ${e.message}`);
    }
  };

  const addModelFromList = (file: { name: string, path: string }) => {
    const newModel: ModelInstance = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(7),
      name: file.name,
      uri: file.path,
      status: 'idle',
      hardware: { ...DEFAULT_HARDWARE }
    };
    setActiveModels(prev => [...prev, newModel]);
    setIsFilePickerVisible(false);
    setTimeout(() => loadModel(newModel), 300);
  };

  const loadModel = async (model: ModelInstance) => {
    try {
      if (llamaContexts.current[model.id]) return;
      setActiveModels(prev => prev.map(m => m.id === model.id ? { ...m, status: 'loading' } : m));
      addLog(`Carregando: ${model.name}...`);

      const absolutePath = model.uri.startsWith('file://') ? model.uri.replace('file://', '') : model.uri;
      const ctx = await initLlama({
        model: absolutePath,
        n_ctx: Math.max(512, parseInt(model.hardware.nCtx)) || 2048,
        n_threads: Math.max(1, parseInt(model.hardware.threads)) || 4,
        n_gpu_layers: Math.max(0, parseInt(model.hardware.gpuLayers)) || 0,
        use_mlock: model.hardware.useMlock,
      });

      llamaContexts.current[model.id] = ctx;
      setActiveModels(prev => prev.map(m => m.id === model.id ? { ...m, status: 'active' } : m));
      addLog(`Modelo ativo: ${model.name}`);
    } catch (e: any) {
      addLog(`ERRO ao carregar ${model.name}: ${e.message}`);
      setActiveModels(prev => prev.map(m => m.id === model.id ? { ...m, status: 'error' } : m));
    }
  };

  const unloadModel = async (modelId: string) => {
    const ctx = llamaContexts.current[modelId];
    if (ctx) {
      try { await ctx.release(); } catch {}
      delete llamaContexts.current[modelId];
    }
    setActiveModels(prev => prev.map(m => m.id === modelId ? { ...m, status: 'idle' } : m));
    addLog("Modelo descarregado.");
  };

  const removeModel = async (modelId: string) => {
    await unloadModel(modelId);
    setActiveModels(prev => prev.filter(m => m.id !== modelId));
  };

  const respondJson = (requestId: string, code: number, data: any) => {
    try {
      httpbridge.respond(requestId, code, 'application/json', JSON.stringify(data));
    } catch (e: any) {
      try {
        httpbridge.respond(requestId, 500, 'application/json', JSON.stringify({ error: { message: 'Internal response error' } }));
      } catch {}
    }
  };

  const parseBody = (postData: any): any => {
    if (!postData) return null;
    if (typeof postData === 'object') return postData;
    if (typeof postData === 'string') {
      const trimmed = postData.trim();
      if (!trimmed) return null;
      try { return JSON.parse(trimmed); } catch { return null; }
    }
    return null;
  };

  const logSeparator = '─'.repeat(30);

  const handleHttpRequest = useCallback((request: any) => {
    try {
      const { url, type, postData, headers, requestId, getData } = request;

      const cleanUrl = (url || '').split('?')[0];
      addLog(`${logSeparator}`);
      addLog(`📥 ${type || 'GET'} ${cleanUrl}`);

      if (cleanUrl === '/health' || cleanUrl === '/') {
        addLog(`✓ 200 /health`);
        respondJson(requestId, 200, {
          status: 'ok',
          models: activeModelsRef.current.filter(m => m.status === 'active').map(m => m.name),
          uptime: Math.floor(Date.now() / 1000),
        });
        return;
      }

      if (cleanUrl === '/v1/models' || cleanUrl === '/models') {
        const models = activeModelsRef.current.map(m => ({
          id: m.name,
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: 'local',
          ready: m.status === 'active',
        }));
        addLog(`✓ 200 /v1/models → ${models.length} modelo(s)`);
        respondJson(requestId, 200, {
          object: 'list',
          data: models,
        });
        return;
      }

      const authHeader = headers?.['authorization'] || headers?.['Authorization'];
      const hasAuth = typeof authHeader === 'string' && authHeader === `Bearer ${apiKeyRef.current}`;
      if (!hasAuth) {
        addLog(`✗ 401 API key inválida`);
        respondJson(requestId, 401, {
          error: {
            message: 'Invalid API key. Send header: Authorization: Bearer <your-key>',
            type: 'invalid_request_error',
            code: 'invalid_api_key',
          }
        });
        return;
      }

      if ((type === 'POST') && (cleanUrl === '/v1/chat/completions' || cleanUrl === '/chat/completions')) {
        (async () => {
          try {
            const body = parseBody(postData);
            if (!body) {
              addLog(`✗ 400 Body JSON inválido`);
              respondJson(requestId, 400, { error: { message: 'Request body is required. Send JSON with Content-Type: application/json', type: 'invalid_request_error' } });
              return;
            }

            let targetModel = activeModelsRef.current.find(m => m.name === body.model);
            if (!targetModel) targetModel = activeModelsRef.current.find(m => m.status === 'active');
            if (!targetModel || targetModel.status !== 'active') {
              addLog(`✗ 400 Modelo '${body.model || 'default'}' não está ativo`);
              respondJson(requestId, 400, { error: { message: `Model '${body.model || 'default'}' is not active. Load a model first.`, type: 'invalid_request_error' } });
              return;
            }

            const ctx = llamaContexts.current[targetModel.id];
            if (!ctx) {
              addLog(`✗ 500 Contexto do modelo não encontrado`);
              respondJson(requestId, 500, { error: { message: 'Llama context not found. Reload the model.', type: 'server_error' } });
              return;
            }

            const messages = body.messages || [];
            if (messages.length === 0) {
              addLog(`✗ 400 Messages array vazio`);
              respondJson(requestId, 400, { error: { message: 'messages array is required and must not be empty', type: 'invalid_request_error' } });
              return;
            }

            const lastMsg = messages[messages.length - 1];
            const prompt = typeof lastMsg?.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg?.content);

            addLog(`📤 Modelo: ${targetModel.name}`);
            addLog(`💬 Última msg: "${prompt?.substring(0, 150)}${(prompt?.length || 0) > 150 ? '...' : ''}"`);
            if (messages.length > 1) {
              addLog(`📋 Histórico: ${messages.length} mensagem(ns) [${messages.map((m: any) => m.role).join(', ')}]`);
            }
            if (body.tools) {
              addLog(`🔧 Tools: ${Array.isArray(body.tools) ? body.tools.length : 'inválido'} ferramenta(s)`);
            }
            addLog(`⚙️ temp=${body.temperature || 0.7} top_p=${body.top_p || 0.95} max_tokens=${body.max_tokens || 2048}`);
            addLog(`⏳ A processar...`);

            const startTime = Date.now();

            const oaiMessages = messages.map((m: any) => ({
              role: m.role,
              content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
            }));

            const validRoles = ['system', 'user', 'assistant', 'tool'];
            for (const msg of oaiMessages) {
              if (!validRoles.includes(msg.role)) {
                addLog(`✗ 400 Role inválido: "${msg.role}"`);
                respondJson(requestId, 400, { error: { message: `Invalid message role: '${msg.role}'. Must be one of: ${validRoles.join(', ')}`, type: 'invalid_request_error' } });
                return;
              }
            }

            const completion = await ctx.completion({
              messages: oaiMessages,
              n_predict: body.max_tokens ? parseInt(body.max_tokens) : 2048,
              stop: Array.isArray(body.stop) ? body.stop : (body.stop ? [body.stop] : []),
              temperature: parseFloat(body.temperature) || 0.7,
              top_p: parseFloat(body.top_p) || 0.95,
              tools: body.tools || undefined,
              tool_choice: body.tool_choice || undefined,
              parallel_tool_calls: body.parallel_tool_calls || undefined,
            });

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

            const responseText = completion?.content || completion?.text || '';
            const toolCalls = completion?.tool_calls || [];
            addLog(`✅ Resposta (${elapsed}s, ${completion?.tokens_predicted || 0} tokens)`, '#4CAF50');
            if (toolCalls.length > 0) {
              addLog(`🔧 Tool calls: ${toolCalls.map((t: any) => t.function?.name).join(', ')}`, '#FFB74D');
            }
            const responsePreview = responseText.length > 200 ? responseText.substring(0, 200) + '...' : responseText;
            addLog(`📝 "${responsePreview || '(sem texto)'}"`, '#80CBC4');

            const responseMessage: any = { role: 'assistant', content: responseText || null };
            if (toolCalls.length > 0) {
              responseMessage.tool_calls = toolCalls;
            }

            respondJson(requestId, 200, {
              id: `chatcmpl-${Date.now()}`,
              object: 'chat.completion',
              created: Math.floor(Date.now() / 1000),
              model: targetModel.name,
              choices: [{
                index: 0,
                message: responseMessage,
                finish_reason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
              }],
              usage: {
                prompt_tokens: completion?.tokens_evaluated || 0,
                completion_tokens: completion?.tokens_predicted || 0,
                total_tokens: (completion?.tokens_evaluated || 0) + (completion?.tokens_predicted || 0),
              },
            });
          } catch (err: any) {
            addLog(`✗ 500 ERRO: ${err.message}`);
            respondJson(requestId, 500, {
              error: { message: err.message || 'Internal server error', type: 'server_error' }
            });
          }
        })();
        return;
      }

      if ((type === 'POST') && (cleanUrl === '/v1/completions' || cleanUrl === '/completions')) {
        (async () => {
          try {
            const body = parseBody(postData);
            if (!body) {
              addLog(`✗ 400 Body JSON inválido`);
              respondJson(requestId, 400, { error: { message: 'Request body is required. Send JSON with Content-Type: application/json', type: 'invalid_request_error' } });
              return;
            }

            let targetModel = activeModelsRef.current.find(m => m.name === body.model);
            if (!targetModel) targetModel = activeModelsRef.current.find(m => m.status === 'active');
            if (!targetModel || targetModel.status !== 'active') {
              addLog(`✗ 400 Modelo não ativo`);
              respondJson(requestId, 400, { error: { message: 'Model is not active. Load a model first.', type: 'invalid_request_error' } });
              return;
            }

            const ctx = llamaContexts.current[targetModel.id];
            if (!ctx) {
              addLog(`✗ 500 Contexto não encontrado`);
              respondJson(requestId, 500, { error: { message: 'Llama context not found. Reload the model.', type: 'server_error' } });
              return;
            }

            const prompt = body.prompt || '';
            if (!prompt) {
              addLog(`✗ 400 Prompt vazio`);
              respondJson(requestId, 400, { error: { message: 'prompt field is required', type: 'invalid_request_error' } });
              return;
            }

            addLog(`📤 Modelo: ${targetModel.name}`);
            addLog(`💬 Prompt: "${prompt.substring(0, 150)}${prompt.length > 150 ? '...' : ''}"`);
            addLog(`⚙️ temp=${body.temperature || 0.7} top_p=${body.top_p || 0.95} max_tokens=${body.max_tokens || 2048}`);
            addLog(`⏳ A processar...`);

            const startTime = Date.now();
            const completion = await ctx.completion({
              prompt,
              n_predict: body.max_tokens ? parseInt(body.max_tokens) : 2048,
              stop: Array.isArray(body.stop) ? body.stop : [],
              temperature: parseFloat(body.temperature) || 0.7,
              top_p: parseFloat(body.top_p) || 0.95,
            });

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

            const responseText = completion?.content || completion?.text || '';
            addLog(`✅ Resposta (${elapsed}s, ${completion?.tokens_predicted || 0} tokens)`, '#4CAF50');
            const responsePreview = responseText.length > 200 ? responseText.substring(0, 200) + '...' : responseText;
            addLog(`📝 "${responsePreview || '(vazia)'}"`, '#80CBC4');

            respondJson(requestId, 200, {
              id: `cmpl-${Date.now()}`,
              object: 'text_completion',
              created: Math.floor(Date.now() / 1000),
              model: targetModel.name,
              choices: [{ text: completion?.content || completion?.text || '', index: 0, finish_reason: 'stop' }],
              usage: {
                prompt_tokens: completion?.tokens_evaluated || 0,
                completion_tokens: completion?.tokens_predicted || 0,
                total_tokens: (completion?.tokens_evaluated || 0) + (completion?.tokens_predicted || 0),
              },
            });
          } catch (err: any) {
            addLog(`✗ 500 ERRO: ${err.message}`);
            respondJson(requestId, 500, {
              error: { message: err.message || 'Internal server error', type: 'server_error' }
            });
          }
        })();
        return;
      }

      addLog(`✗ 404 ${type || 'GET'} ${cleanUrl}`);
      respondJson(requestId, 404, {
        error: {
          message: `Endpoint not found: ${type || 'GET'} ${cleanUrl}`,
          type: 'invalid_request_error',
          available_endpoints: [
            'GET  /health',
            'GET  /v1/models',
            'POST /v1/chat/completions',
            'POST /v1/completions',
          ]
        }
      });
    } catch (err: any) {
      addLog(`✗ CRASH: ${err.message}`);
      try {
        respondJson(requestId, 500, {
          error: { message: err.message || 'Unexpected server error', type: 'server_error' }
        });
      } catch {}
    }
  }, []);

  const startServer = useCallback(async () => {
    try {
      const portNum = parseInt(port);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) return Alert.alert("Erro", "Porta inválida (1-65535)");

      addLog(`Iniciando servidor na porta ${portNum}...`);
      httpbridge.start(portNum, 'talos-server', handleHttpRequest);

      setIsServerActive(true);
      const displayIp = isManualIpEnabled ? manualIp : ipAddress;
      addLog(`Servidor ativo: http://${displayIp}:${portNum}`);
      addLog(`Endpoints: /v1/chat/completions, /v1/completions, /v1/models, /health`);
    } catch (error: any) {
      addLog(`FALHA: ${error.message}`);
      Alert.alert("Erro", error.message);
      setIsServerActive(false);
    }
  }, [port, isManualIpEnabled, manualIp, ipAddress, handleHttpRequest]);

  const stopServer = useCallback(async () => {
    addLog("Desligando servidor...");
    try { httpbridge.stop(); } catch {}
    for (const modelId in llamaContexts.current) {
      try { await llamaContexts.current[modelId].release(); } catch {}
      delete llamaContexts.current[modelId];
    }
    setActiveModels(prev => prev.map(m => ({ ...m, status: 'idle' as const })));
    setIsServerActive(false);
    addLog("Servidor offline.");
  }, []);

  const toggleServer = () => {
    if (!isServerActive) startServer();
    else stopServer();
  };

  useEffect(() => {
    loadConfig();
    detectIp();
    scanModels();
    return () => { try { httpbridge.stop(); } catch {} };
  }, []);

  const openHardwareSettings = (modelId: string) => {
    setEditingModelId(modelId);
    setIsModalVisible(true);
  };

  const editingModel = activeModels.find(m => m.id === editingModelId);

  const bgColor = isDark ? '#0F0F0F' : '#F5F5F5';
  const cardBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const textColor = isDark ? '#FFF' : '#000';
  const secondaryText = isDark ? '#666' : '#777';
  const borderColor = isDark ? '#333' : '#E0E0E0';
  const inputBg = isDark ? '#1E1E1E' : '#F0F0F0';

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { backgroundColor: bgColor }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>API Server</Text>
          <Server size={32} color={isServerActive ? "#4CAF50" : "#666"} />
        </View>

        <View style={[styles.statusCard, { backgroundColor: cardBg, borderColor: isServerActive ? '#4CAF5088' : borderColor }]}>
          <View style={styles.statusInfo}>
            <View style={[styles.statusIndicator, { backgroundColor: isServerActive ? '#4CAF50' : '#F44336' }]} />
            <Text style={[styles.statusText, { color: textColor }]}>{isServerActive ? 'Servidor Ativo' : 'Servidor Desligado'}</Text>
          </View>
          <Switch value={isServerActive} onValueChange={toggleServer} trackColor={{ false: '#333', true: '#4CAF50' }} thumbColor={isServerActive ? '#FFF' : '#888'} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: secondaryText }]}>REDE</Text>
            <View style={styles.manualIpRow}>
              <Text style={[styles.manualIpLabel, { color: secondaryText }]}>IP Manual</Text>
              <Switch value={isManualIpEnabled} onValueChange={setIsManualIpEnabled} trackColor={{ false: '#333', true: '#007AFF' }} style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }} />
            </View>
          </View>

          <View style={styles.configItem}>
            <View style={styles.configHeader}>
              <Globe size={18} color={secondaryText} style={{ marginRight: 8 }} />
              <Text style={[styles.configLabel, { color: secondaryText }]}>{isManualIpEnabled ? 'IP Manual' : 'IP Local'}</Text>
            </View>
            {isManualIpEnabled ? (
              <TextInput style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]} value={manualIp} onChangeText={setManualIp} placeholder="192.168.1.100" placeholderTextColor={isDark ? "#444" : "#999"} />
            ) : (
              <TouchableOpacity style={[styles.valueContainer, { backgroundColor: inputBg, borderColor }]} onPress={() => ipAddress !== '0.0.0.0' && copyToClipboard(`http://${ipAddress}:${port}`, 'URL do Servidor')}>
                <Text style={[styles.ipValue, { color: textColor }]}>{ipAddress === '0.0.0.0' ? 'Detectando...' : `${ipAddress}:${port}`}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {copiedField === 'URL do Servidor' ? (
                    <Text style={{ color: '#4CAF50', fontSize: 11, fontWeight: '600', marginRight: 6 }}>Copiado!</Text>
                  ) : (
                    <Copy size={14} color={secondaryText} style={{ marginRight: 6 }} />
                  )}
                  <Wifi size={16} color={ipAddress !== '0.0.0.0' ? '#4CAF50' : '#999'} />
                </View>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.configItem}>
            <View style={styles.configHeader}>
              <Cpu size={18} color={secondaryText} style={{ marginRight: 8 }} />
              <Text style={[styles.configLabel, { color: secondaryText }]}>Porta</Text>
            </View>
            <TextInput style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]} value={port} onChangeText={setPort} keyboardType="numeric" placeholder="1234" placeholderTextColor={isDark ? "#444" : "#999"} editable={!isServerActive} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: secondaryText }]}>SEGURANÇA</Text>
          <View style={styles.configItem}>
            <View style={styles.configHeader}>
              <Shield size={18} color={secondaryText} style={{ marginRight: 8 }} />
              <Text style={[styles.configLabel, { color: secondaryText }]}>API Key (Bearer)</Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput style={[styles.input, { flex: 1, backgroundColor: inputBg, color: textColor, borderColor }]} value={showApiKey ? apiKey : '••••••••••••••••'} onChangeText={setApiKey} autoCapitalize="none" editable={!isServerActive} />
              <TouchableOpacity style={styles.refreshButton} onPress={() => setShowApiKey(!showApiKey)}>
                <Text style={{ color: textColor, fontSize: 11, fontWeight: '600' }}>{showApiKey ? 'Ocultar' : 'Mostrar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.refreshButton} onPress={() => copyToClipboard(apiKey, 'API Key')}>
                {copiedField === 'API Key' ? (
                  <Text style={{ color: '#4CAF50', fontSize: 11, fontWeight: '600' }}>Copiado!</Text>
                ) : (
                  <Copy size={18} color={textColor} />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.refreshButton} onPress={generateNewKey} disabled={isServerActive}>
                <RefreshCw size={18} color={isServerActive ? "#444" : textColor} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: secondaryText }]}>MODELOS ({activeModels.filter(m => m.status === 'active').length} ativos)</Text>
            <TouchableOpacity onPress={() => { scanModels(); setIsFilePickerVisible(true); }} style={styles.addButton}>
              <Plus size={18} color="#FFF" />
              <Text style={styles.addButtonText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {activeModels.map(model => (
            <View key={model.id} style={[styles.modelCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.modelCardHeader}>
                <View style={styles.modelIdentity}>
                  <Cpu size={20} color={model.status === 'active' ? '#4CAF50' : model.status === 'error' ? '#F44336' : '#007AFF'} style={{ marginRight: 12 }} />
                  <View>
                    <Text style={[styles.modelCardName, { color: textColor }]} numberOfLines={1}>{model.name}</Text>
                    <Text style={[styles.modelStatusText, { color: model.status === 'active' ? '#4CAF50' : model.status === 'error' ? '#F44336' : secondaryText }]}>
                      {model.status === 'loading' ? 'CARREGANDO...' : model.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.modelActions}>
                  <TouchableOpacity onPress={() => openHardwareSettings(model.id)} style={[styles.iconAction, { backgroundColor: isDark ? '#2A2A2A' : '#E0E0E0' }]}>
                    <Settings size={20} color={secondaryText} />
                  </TouchableOpacity>
                  {model.status === 'active' ? (
                    <TouchableOpacity onPress={() => unloadModel(model.id)} style={[styles.iconAction, { backgroundColor: '#F4433622' }]}>
                      <Square size={18} color="#F44336" />
                    </TouchableOpacity>
                  ) : model.status === 'idle' || model.status === 'error' ? (
                    <TouchableOpacity onPress={() => loadModel(model)} style={[styles.iconAction, { backgroundColor: '#4CAF5022' }]}>
                      <RefreshCw size={18} color="#4CAF50" />
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity onPress={() => removeModel(model.id)} style={[styles.iconAction, { backgroundColor: isDark ? '#2A2A2A' : '#E0E0E0' }]}>
                    <Trash2 size={20} color={secondaryText} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          {activeModels.length === 0 && (
            <View style={[styles.emptyContainer, { backgroundColor: isDark ? '#111' : '#F5F5F5', borderColor }]}>
              <Text style={[styles.emptyText, { color: secondaryText }]}>Nenhum modelo. Toque em "Adicionar".</Text>
            </View>
          )}

          <Text style={[styles.infoNote, { color: isDark ? '#555' : '#999' }]}>Compatível com OpenAI API. Use: Authorization: Bearer {apiKey.substring(0, 8)}...</Text>
        </View>

        {logs.length > 0 && (
          <View style={styles.logsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: secondaryText }]}>LOGS</Text>
              <TouchableOpacity onPress={() => setLogs([])}>
                <Text style={{ color: '#007AFF', fontSize: 12 }}>Limpar</Text>
              </TouchableOpacity>
            </View>
            <ScrollView ref={logRef} style={[styles.logContainer, { backgroundColor: isDark ? '#000' : '#1A1A1A', borderColor }]} nestedScrollEnabled onContentSizeChange={() => logRef.current?.scrollToEnd({ animated: false })}>
              {logs.map((log, i) => {
                let color = log.color || '#00FF00';
                if (!log.color) {
                  if (log.text.includes('✓') || log.text.includes('✅')) color = '#4CAF50';
                  else if (log.text.includes('✗') || log.text.includes('ERRO')) color = '#FF5252';
                  else if (log.text.includes('⏳')) color = '#FFD740';
                  else if (log.text.includes('💬') || log.text.includes('📤')) color = '#40C4FF';
                  else if (log.text.includes('📥')) color = '#B388FF';
                  else if (log.text.includes('───')) color = '#555';
                }
                return <Text key={i} style={[styles.logLine, { color }]}>{log.text}</Text>;
              })}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Hardware</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}><X size={24} color={textColor} /></TouchableOpacity>
            </View>
            {editingModel && (
              <View>
                <Text style={[styles.modalSubtitle, { color: '#007AFF' }]}>{editingModel.name}</Text>
                <View style={styles.modalSection}>
                  <View style={styles.gridRow}>
                    <View style={styles.modalInputItem}>
                      <Text style={[styles.modalLabel, { color: secondaryText }]}>Threads CPU</Text>
                      <TextInput style={[styles.modalInput, { backgroundColor: inputBg, color: textColor, borderColor }]} value={editingModel.hardware.threads} onChangeText={(t) => setActiveModels(prev => prev.map(m => m.id === editingModelId ? { ...m, hardware: { ...m.hardware, threads: t } } : m))} keyboardType="numeric" />
                    </View>
                    <View style={styles.modalInputItem}>
                      <Text style={[styles.modalLabel, { color: secondaryText }]}>GPU Layers</Text>
                      <TextInput style={[styles.modalInput, { backgroundColor: inputBg, color: textColor, borderColor }]} value={editingModel.hardware.gpuLayers} onChangeText={(t) => setActiveModels(prev => prev.map(m => m.id === editingModelId ? { ...m, hardware: { ...m.hardware, gpuLayers: t } } : m))} keyboardType="numeric" />
                    </View>
                  </View>
                  <View style={styles.gridRow}>
                    <View style={styles.modalInputItem}>
                      <Text style={[styles.modalLabel, { color: secondaryText }]}>Contexto (Tokens)</Text>
                      <TextInput style={[styles.modalInput, { backgroundColor: inputBg, color: textColor, borderColor }]} value={editingModel.hardware.nCtx} onChangeText={(t) => setActiveModels(prev => prev.map(m => m.id === editingModelId ? { ...m, hardware: { ...m.hardware, nCtx: t } } : m))} keyboardType="numeric" />
                    </View>
                    <View style={styles.modalInputItem}>
                      <Text style={[styles.modalLabel, { color: secondaryText }]}>Mlock (RAM)</Text>
                      <View style={[styles.switchBox, { backgroundColor: inputBg }]}>
                        <Switch value={editingModel.hardware.useMlock} onValueChange={(v) => setActiveModels(prev => prev.map(m => m.id === editingModelId ? { ...m, hardware: { ...m.hardware, useMlock: v } } : m))} />
                      </View>
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={[styles.saveButton, { flex: 1, backgroundColor: '#FF9500' }]} onPress={async () => {
                    if (editingModel && editingModel.status === 'active') {
                      await unloadModel(editingModel.id);
                      addLog(`Modelo descarregado para aplicar novas configurações...`);
                      const updated = activeModels.find(m => m.id === editingModelId);
                      if (updated) {
                        setIsModalVisible(false);
                        setTimeout(() => loadModel(updated), 300);
                      } else {
                        setIsModalVisible(false);
                      }
                    } else {
                      setIsModalVisible(false);
                    }
                  }}>
                    <Text style={styles.saveButtonText}>Aplicar & Recarregar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveButton, { flex: 1 }]} onPress={() => setIsModalVisible(false)}>
                    <Text style={styles.saveButtonText}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={isFilePickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Modelos Disponíveis</Text>
              <TouchableOpacity onPress={() => setIsFilePickerVisible(false)}><X size={24} color={textColor} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {availableFiles.map((file, i) => (
                <TouchableOpacity key={i} style={[styles.fileItem, { backgroundColor: inputBg }]} onPress={() => addModelFromList(file)}>
                  <Cpu size={18} color="#007AFF" style={{ marginRight: 12 }} />
                  <Text style={[styles.fileItemText, { color: textColor }]} numberOfLines={1}>{file.name}</Text>
                  <ChevronRight size={18} color={secondaryText} />
                </TouchableOpacity>
              ))}
              {availableFiles.length === 0 && (
                <Text style={[styles.emptyText, { color: secondaryText, textAlign: 'center', padding: 20 }]}>Nenhum .gguf encontrado em:\n{MODELS_DIR}</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold' },
  statusCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 20, marginBottom: 30, borderWidth: 1 },
  statusInfo: { flexDirection: 'row', alignItems: 'center' },
  statusIndicator: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  statusText: { fontSize: 16, fontWeight: '600' },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 12, fontWeight: '700', marginBottom: 15, letterSpacing: 1 },
  configItem: { marginBottom: 20 },
  configHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  configLabel: { fontSize: 14 },
  valueContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1 },
  ipValue: { fontSize: 16, fontWeight: '500' },
  input: { padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  refreshButton: { marginLeft: 10, width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoNote: { fontSize: 11, marginTop: 12, fontStyle: 'italic', lineHeight: 16 },
  logsSection: { marginTop: 10 },
  logContainer: { padding: 15, borderRadius: 12, borderWidth: 1, minHeight: 120 },
  logLine: { color: '#00FF00', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12, marginBottom: 6, opacity: 0.8 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  manualIpRow: { flexDirection: 'row', alignItems: 'center' },
  manualIpLabel: { fontSize: 11, fontWeight: '600', marginRight: 4 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF22', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  addButtonText: { color: '#007AFF', fontSize: 12, fontWeight: '700', marginLeft: 6 },
  modelCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  modelCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modelIdentity: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  modelCardName: { fontSize: 15, fontWeight: '600' },
  modelStatusText: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  modelActions: { flexDirection: 'row', alignItems: 'center' },
  iconAction: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  emptyContainer: { padding: 40, alignItems: 'center', borderRadius: 20, borderStyle: 'dashed', borderWidth: 1 },
  emptyText: { fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 50 },
  pickerContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 50, minHeight: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalSubtitle: { fontSize: 14, marginBottom: 25 },
  modalSection: { marginBottom: 30 },
  modalInputItem: { flex: 1, marginBottom: 20, marginRight: 10 },
  modalLabel: { fontSize: 12, marginBottom: 8, fontWeight: '600' },
  modalInput: { padding: 15, borderRadius: 12, fontSize: 16 },
  switchBox: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveButton: { backgroundColor: '#007AFF', padding: 18, borderRadius: 15, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  fileItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 15, marginBottom: 10 },
  fileItemText: { fontSize: 14, flex: 1 },
});
