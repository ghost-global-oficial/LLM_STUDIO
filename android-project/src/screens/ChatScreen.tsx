import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, NativeModules
} from 'react-native';
import { ArrowLeft, Bot, ArrowUp, Paperclip, Mic, Zap, Clock } from 'lucide-react-native';
import { initLlama, LlamaContext } from 'llama.rn';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useTheme } from '../context/ThemeContext';
import { useSettings, useTranslation } from '../context/SettingsContext';
import { useSkills } from '../context/SkillsContext';
import { useEncryption } from '../context/EncryptionContext';
import { ModelType } from '../data/modelsData';
import AirLLMCard from '../components/AirLLMCard';
import RNFS from 'react-native-fs';

const HISTORY_DIR = `${RNFS.DocumentDirectoryPath}/chat_history`;

interface ChatHistoryItem {
  id: string;
  fileName: string;
  messages: Message[];
  savedAt: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  isToolCall?: boolean;
  isToolResult?: boolean;
  toolName?: string;
}

const TOOL_CALL_REGEX = /\[TOOL_CALL:\s*(\w+)\(([^)]*)\)\]/;

function parseToolCall(text: string): { skillName: string; args: Record<string, any> } | null {
  const match = text.match(TOOL_CALL_REGEX);
  if (!match) return null;

  const skillName = match[1];
  const argsStr = match[2];
  const args: Record<string, any> = {};

  const argRegex = /(\w+)\s*=\s*(?:"([^"]*)"|(\d+(?:\.\d+)?)|(\w+))/g;
  let argMatch;
  while ((argMatch = argRegex.exec(argsStr)) !== null) {
    if (argMatch[2] !== undefined) args[argMatch[1]] = argMatch[2];
    else if (argMatch[3] !== undefined) args[argMatch[1]] = parseFloat(argMatch[3]);
    else if (argMatch[4] === 'true') args[argMatch[1]] = true;
    else if (argMatch[4] === 'false') args[argMatch[1]] = false;
    else args[argMatch[1]] = argMatch[4];
  }

  return { skillName, args };
}

export default function ChatScreen({ route, navigation }: Props) {
  const { isDark } = useTheme();
  const { systemPrompt, performanceMode } = useSettings();
  const { t } = useTranslation();
  const { skills, executeSkill, getSystemPromptWithTools } = useSkills();
  const { encrypt, decrypt } = useEncryption();
  const { fileUri, fileName, loadHistory } = route.params;
  const [modelReady, setModelReady] = useState(false);
  const [loading, setLoading] = useState(!loadHistory);
  const [messages, setMessages] = useState<Message[]>(
    loadHistory ? loadHistory.messages : [{ id: '1', text: `${t('connected')} ${fileName}. ${t('testMessage')}`, isUser: false }]
  );
  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(34);
  const [showAirLLMCard, setShowAirLLMCard] = useState(false);
  const [modelType, setModelType] = useState<ModelType>('text');
  const llamaContext = useRef<LlamaContext | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const conversationId = useRef<string>(Date.now().toString());
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  const saveConversation = async (msgs: Message[]) => {
    try {
      const userMsgs = msgs.filter(m => m.isUser);
      if (userMsgs.length === 0) return;
      await RNFS.mkdir(HISTORY_DIR);
      const item: ChatHistoryItem = {
        id: conversationId.current,
        fileName,
        messages: msgs.filter(m => !m.isToolCall && !m.isToolResult),
        savedAt: new Date().toISOString(),
      };
      const json = JSON.stringify(item);
      const encrypted = encrypt(json);
      await RNFS.writeFile(`${HISTORY_DIR}/${conversationId.current}.enc`, encrypted, 'utf8');
    } catch (e) {}
  };

  useEffect(() => {
    if (!fileUri) {
      setModelReady(false);
      setLoading(false);
      return;
    }

    const detectType = (name: string): ModelType => {
      const lower = name.toLowerCase();
      if (lower.includes('sd_') || lower.includes('stable-diffusion') || lower.includes('flux') || lower.includes('dreamshaper') || lower.includes('sdxl')) {
        return 'image';
      }
      if (lower.includes('cogvideo') || (lower.includes('wan') && lower.includes('video'))) {
        return 'video';
      }
      if (lower.includes('triposr') || lower.includes('instantmesh') || lower.includes('3d')) {
        return '3d';
      }
      return 'text';
    };

    const detectedType = detectType(fileName);
    setModelType(detectedType);

    if (detectedType !== 'text') {
      setShowAirLLMCard(true);
      return;
    }

    let active = true;
    const startLlamaSession = async () => {
      try {
        setLoading(true);
        if (llamaContext.current) {
          await llamaContext.current.release();
        }

        const absolutePath = fileUri.replace('file://', '');

        let perfSettings = { n_threads: 4, n_ctx: 1024, n_gpu_layers: 0, use_mlock: false };
        try {
          const DeviceModule = NativeModules.DeviceModule;
          if (DeviceModule && DeviceModule.getPerformanceSettings) {
            const settings = await DeviceModule.getPerformanceSettings(performanceMode);
            perfSettings = {
              n_threads: settings.n_threads || 4,
              n_ctx: settings.n_ctx || 1024,
              n_gpu_layers: settings.n_gpu_layers || 0,
              use_mlock: settings.use_mlock || false,
            };
          }
        } catch (e) {}

        llamaContext.current = await initLlama({
          model: absolutePath,
          use_mlock: perfSettings.use_mlock,
          n_ctx: perfSettings.n_ctx,
          n_threads: perfSettings.n_threads,
          n_gpu_layers: perfSettings.n_gpu_layers,
        });

        if (active) {
          setModelReady(true);
          setLoading(false);
        }
      } catch (error: any) {
        if (!active) return;
        setLoading(false);
        const errMsg = (error?.message || '').toLowerCase();
        if (errMsg.includes('install') && errMsg.includes('null')) {
          Alert.alert(
            'Expo Go Error',
            'llama.rn native code (C++) not found. Run npx expo prebuild --platform android then npx expo run:android',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          Alert.alert(t('modelError'), String(error));
        }
      }
    };
    startLlamaSession();

    return () => {
      active = false;
      if (llamaContext.current) {
        llamaContext.current.release().catch(() => {});
      }
      saveConversation(messagesRef.current);
    };
  }, [fileUri]);

  const runCompletion = async (prompt: string): Promise<string> => {
    if (!llamaContext.current) throw new Error('Model not loaded');

    let fullResponse = '';
    let hasStarted = false;

    const inferenceParams: Record<string, any> = {
      prompt,
      stop: ["<|end|>", "<|", "User:", "Assistant:"],
    };

    switch (performanceMode) {
      case 'performance':
        inferenceParams.n_predict = 1024;
        inferenceParams.temperature = 0.8;
        inferenceParams.top_p = 0.95;
        inferenceParams.repeat_penalty = 1.1;
        break;
      case 'balanced':
        inferenceParams.n_predict = 512;
        inferenceParams.temperature = 0.7;
        inferenceParams.top_p = 0.9;
        inferenceParams.repeat_penalty = 1.15;
        break;
      case 'efficiency':
        inferenceParams.n_predict = 256;
        inferenceParams.temperature = 0.5;
        inferenceParams.top_p = 0.85;
        inferenceParams.repeat_penalty = 1.2;
        break;
      default:
        inferenceParams.n_predict = 512;
        inferenceParams.temperature = 0.7;
        inferenceParams.top_p = 0.9;
        inferenceParams.repeat_penalty = 1.15;
    }

    await llamaContext.current.completion(inferenceParams, (data: any) => {
      if (!data) return;
      let tokenText = '';
      if (typeof data === 'string') {
        tokenText = data;
      } else {
        tokenText = data.token || data.text || data.content || data.choices?.[0]?.delta?.content || '';
      }
      if (tokenText) fullResponse += tokenText;
    });

    return fullResponse;
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return Alert.alert('Aviso', 'Escreva algo antes de enviar!');
    if (!llamaContext.current) return Alert.alert(t('error'), 'Model not loaded');

    const userMsg: Message = { id: Date.now().toString(), text: inputText, isUser: true };
    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: Message = { id: aiMsgId, text: '', isUser: false };

    setMessages(prev => [...prev, userMsg, aiMsg]);

    const promptToSend = inputText;
    setInputText('');
    setLoading(true);

    try {
      const currentMessages = messages;
      const toolsPrompt = getSystemPromptWithTools();
      let fullContext = `<|system|>\n${systemPrompt}`;
      if (toolsPrompt) fullContext += `\n\n${toolsPrompt}`;
      fullContext += ` <|end|>\n`;

      currentMessages.forEach(msg => {
        if (msg.id !== '1' && msg.text !== '' && !msg.isToolCall && !msg.isToolResult) {
          fullContext += msg.isUser ? `<|user|>\n${msg.text} <|end|>\n` : `<|assistant|>\n${msg.text} <|end|>\n`;
        }
      });
      fullContext += `<|user|>\n${promptToSend} <|end|>\n<|assistant|>\n`;

      let response = await runCompletion(fullContext);

      const toolCall = parseToolCall(response);

      if (toolCall) {
        const skill = skills.find(s => s.name === toolCall.skillName && s.enabled);

        if (skill) {
          setMessages(prev => prev.map(m =>
            m.id === aiMsgId ? { ...m, text: response } : m
          ));

          const toolCallMsg: Message = {
            id: `tc_${Date.now()}`,
            text: `${t('callingTool')}: ${skill.name}(${JSON.stringify(toolCall.args)})`,
            isUser: false,
            isToolCall: true,
            toolName: skill.name,
          };
          setMessages(prev => [...prev, toolCallMsg]);

          try {
            const result = await executeSkill(skill, toolCall.args);
            const resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);

            const resultMsg: Message = {
              id: `tr_${Date.now()}`,
              text: `${t('toolResult')}: ${resultStr}`,
              isUser: false,
              isToolResult: true,
              toolName: skill.name,
            };
            setMessages(prev => [...prev, resultMsg]);

            let followUpContext = `<|system|>\n${systemPrompt}`;
            if (toolsPrompt) followUpContext += `\n\n${toolsPrompt}`;
            followUpContext += ` <|end|>\n`;

            currentMessages.forEach(msg => {
              if (msg.id !== '1' && msg.text !== '' && !msg.isToolCall && !msg.isToolResult) {
                followUpContext += msg.isUser ? `<|user|>\n${msg.text} <|end|>\n` : `<|assistant|>\n${msg.text} <|end|>\n`;
              }
            });
            followUpContext += `<|user|>\n${promptToSend} <|end|>\n<|assistant|>\n${response}\n<|tool_result|>\n${resultStr} <|end|>\n<|assistant|>\n`;

            const followUpResponse = await runCompletion(followUpContext);

            const finalMsg: Message = {
              id: `fr_${Date.now()}`,
              text: followUpResponse || t('noResponse'),
              isUser: false,
            };
            setMessages(prev => [...prev, finalMsg]);
          } catch (toolError: any) {
            const errorMsg: Message = {
              id: `te_${Date.now()}`,
              text: `${t('toolError')}: ${toolError.message}`,
              isUser: false,
              isToolResult: true,
              toolName: skill.name,
            };
            setMessages(prev => [...prev, errorMsg]);
          }
        } else {
          setMessages(prev => prev.map(m =>
            m.id === aiMsgId ? { ...m, text: response } : m
          ));
        }
      } else {
        setMessages(prev => prev.map(m => {
          if (m.id === aiMsgId && m.text === '') {
            return { ...m, text: response || t('noResponse') };
          }
          return m;
        }));
      }
    } catch (error: any) {
      console.error('Inference crash:', error);
      Alert.alert(t('error'), t('inferenceError') + ': ' + (error.message || 'Unknown'));
      setMessages(prev => prev.filter(m => m.id !== aiMsgId));
    } finally {
      setLoading(false);
    }
  };

  const bgColor = isDark ? '#0F0F0F' : '#F5F5F5';
  const headerBg = isDark ? '#0F0F0F' : '#F5F5F5';
  const headerBorder = isDark ? '#1A1A1A' : '#E0E0E0';
  const textColor = isDark ? '#FFF' : '#000';
  const secondaryText = isDark ? '#888' : '#666';
  const inputAreaBg = isDark ? '#0F0F0F' : '#F5F5F5';
  const inputBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const inputBorder = isDark ? '#2A2A2A' : '#E0E0E0';
  const placeholderColor = isDark ? '#666' : '#999';
  const avatarBg = isDark ? '#2A2A2A' : '#E0E0E0';
  const bubbleBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const bubbleBorder = isDark ? '#333' : '#DDD';

  const enabledCount = skills.filter(s => s.enabled).length;

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: bgColor }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: isDark ? '#1E1E1E' : '#E0E0E0' }]} onPress={() => {
          saveConversation(messages);
          navigation.goBack();
        }}>
          <ArrowLeft size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>{fileName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            {!modelReady && <ActivityIndicator size="small" color="#007AFF" style={{ marginRight: 6 }} />}
            <Text style={[styles.headerSubtitle, { color: secondaryText }]}>{modelReady ? t('online') : t('loadModel')}</Text>
            {enabledCount > 0 && (
              <View style={[styles.toolsBadge, { backgroundColor: '#007AFF20' }]}>
                <Zap size={10} color="#007AFF" />
                <Text style={styles.toolsBadgeText}>{enabledCount} tools</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: isDark ? '#1E1E1E' : '#E0E0E0' }]} onPress={() => navigation.navigate('ChatHistory')}>
          <Clock size={20} color={textColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => {
          if (msg.isToolCall) {
            return (
              <View key={msg.id} style={styles.toolCallContainer}>
                <View style={[styles.toolCallBadge, { backgroundColor: '#FF950020', borderColor: '#FF950040' }]}>
                  <Zap size={14} color="#FF9500" />
                  <Text style={[styles.toolCallText, { color: '#FF9500' }]}>{msg.text}</Text>
                </View>
              </View>
            );
          }
          if (msg.isToolResult) {
            return (
              <View key={msg.id} style={styles.toolResultContainer}>
                <View style={[styles.toolResultBadge, { backgroundColor: '#34C75920', borderColor: '#34C75940' }]}>
                  <Text style={[styles.toolResultLabel, { color: '#34C759' }]}>{t('toolResult')}</Text>
                  <Text style={[styles.toolResultText, { color: secondaryText }]} numberOfLines={6}>{msg.text}</Text>
                </View>
              </View>
            );
          }
          return (
            <View key={msg.id} style={[styles.messageWrapper, msg.isUser ? styles.messageWrapperUser : styles.messageWrapperAI]}>
              {!msg.isUser && (
                <View style={[styles.avatarAI, { backgroundColor: avatarBg, borderColor: bubbleBorder }]}>
                  <Bot size={16} color={textColor} strokeWidth={2.5} />
                </View>
              )}
              <View style={[styles.messageBubble, msg.isUser ? styles.userMessage : styles.aiMessage, { backgroundColor: bubbleBg, borderColor: bubbleBorder }]}>
                <Text style={[styles.messageText, { color: textColor }]}>{msg.text}</Text>
              </View>
            </View>
          );
        })}
        {loading && modelReady && (
          <View style={[styles.messageWrapper, styles.messageWrapperAI]}>
            <View style={[styles.avatarAI, { backgroundColor: avatarBg, borderColor: bubbleBorder }]}>
              <Bot size={16} color={textColor} strokeWidth={2.5} />
            </View>
            <View style={[styles.messageBubble, styles.aiMessage, { backgroundColor: bubbleBg, borderColor: bubbleBorder, flexDirection: 'row', alignItems: 'center' }]}>
               <ActivityIndicator size="small" color={secondaryText} style={{ marginRight: 8 }} />
               <Text style={[styles.messageText, { color: secondaryText, fontStyle: 'italic' }]}>{t('processing')}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputArea, { backgroundColor: inputAreaBg }]}>
        <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: inputBorder }]}>
          <TouchableOpacity style={styles.attachButton} onPress={() => Alert.alert('Arquivos', 'Seletor de arquivos em breve.')}>
             <Paperclip size={20} color={placeholderColor} />
          </TouchableOpacity>
          <TextInput
            style={[styles.textInput, { color: textColor, height: Math.min(inputHeight, 120) }]}
            value={inputText}
            onChangeText={setInputText}
            onContentSizeChange={(e) => {
              const h = e.nativeEvent.contentSize.height;
              setInputHeight(Math.max(34, Math.min(h, 120)));
            }}
            placeholder={modelReady ? t('writeMessage') : t('waitLoad')}
            placeholderTextColor={placeholderColor}
            editable={modelReady && !loading}
            multiline
          />
          <TouchableOpacity style={styles.voiceButton} onPress={() => Alert.alert('Voz', 'Voz em desenvolvimento.')}>
             <Mic size={20} color={placeholderColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, (!modelReady || (!inputText.trim() && !loading) || loading) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!modelReady || (!inputText.trim() && !loading) || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <ArrowUp size={20} color={(!modelReady || !inputText.trim()) ? placeholderColor : (isDark ? "#000" : "#FFF")} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <AirLLMCard
        visible={showAirLLMCard}
        modelType={modelType}
        modelName={fileName}
        onActivate={() => {
          setShowAirLLMCard(false);
          let active = true;
          const startLlamaSession = async () => {
            try {
              setLoading(true);
              if (llamaContext.current) {
                await llamaContext.current.release();
              }
              const absolutePath = fileUri.replace('file://', '');
              let perfSettings = { n_threads: 4, n_ctx: 1024, n_gpu_layers: 0, use_mlock: false };
              try {
                const DeviceModule = NativeModules.DeviceModule;
                if (DeviceModule && DeviceModule.getPerformanceSettings) {
                  const settings = await DeviceModule.getPerformanceSettings(performanceMode);
                  perfSettings = {
                    n_threads: settings.n_threads || 4,
                    n_ctx: settings.n_ctx || 1024,
                    n_gpu_layers: settings.n_gpu_layers || 0,
                    use_mlock: settings.use_mlock || false,
                  };
                }
              } catch (e) {}
              llamaContext.current = await initLlama({
                model: absolutePath,
                use_mlock: perfSettings.use_mlock,
                n_ctx: perfSettings.n_ctx,
                n_threads: perfSettings.n_threads,
                n_gpu_layers: perfSettings.n_gpu_layers,
              });
              if (active) {
                setModelReady(true);
                setLoading(false);
              }
            } catch (error: any) {
              if (!active) return;
              setLoading(false);
              Alert.alert(t('modelError'), String(error));
            }
          };
          startLlamaSession();
        }}
        onDecline={() => {
          setShowAirLLMCard(false);
          let active = true;
          const startLlamaSession = async () => {
            try {
              setLoading(true);
              if (llamaContext.current) {
                await llamaContext.current.release();
              }
              const absolutePath = fileUri.replace('file://', '');
              let perfSettings = { n_threads: 4, n_ctx: 1024, n_gpu_layers: 0, use_mlock: false };
              try {
                const DeviceModule = NativeModules.DeviceModule;
                if (DeviceModule && DeviceModule.getPerformanceSettings) {
                  const settings = await DeviceModule.getPerformanceSettings(performanceMode);
                  perfSettings = {
                    n_threads: settings.n_threads || 4,
                    n_ctx: settings.n_ctx || 1024,
                    n_gpu_layers: settings.n_gpu_layers || 0,
                    use_mlock: settings.use_mlock || false,
                  };
                }
              } catch (e) {}
              llamaContext.current = await initLlama({
                model: absolutePath,
                use_mlock: perfSettings.use_mlock,
                n_ctx: perfSettings.n_ctx,
                n_threads: perfSettings.n_threads,
                n_gpu_layers: perfSettings.n_gpu_layers,
              });
              if (active) {
                setModelReady(true);
                setLoading(false);
              }
            } catch (error: any) {
              if (!active) return;
              setLoading(false);
              Alert.alert(t('modelError'), String(error));
            }
          };
          startLlamaSession();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 15,
    borderBottomWidth: 1
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitleContainer: { flex: 1, alignItems: 'center', marginHorizontal: 10 },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  toolsBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  toolsBadgeText: { fontSize: 10, color: '#007AFF', fontWeight: '600', marginLeft: 4 },
  chatArea: { flex: 1, paddingHorizontal: 16 },
  chatContent: { paddingVertical: 20 },
  messageWrapper: { flexDirection: 'row', marginBottom: 24, width: '100%' },
  messageWrapperUser: { justifyContent: 'flex-end' },
  messageWrapperAI: { justifyContent: 'flex-start', alignItems: 'flex-end' },
  avatarAI: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginBottom: 4, borderWidth: 1 },
  messageBubble: { maxWidth: '85%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18 },
  userMessage: { borderRadius: 20, borderBottomRightRadius: 4, borderWidth: 1 },
  aiMessage: { borderRadius: 20, borderBottomLeftRadius: 4, borderWidth: 1 },
  messageText: { fontSize: 16, lineHeight: 24 },
  toolCallContainer: { marginBottom: 8, paddingLeft: 38 },
  toolCallBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  toolCallText: { fontSize: 12, marginLeft: 6, flex: 1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  toolResultContainer: { marginBottom: 12, paddingLeft: 38 },
  toolResultBadge: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  toolResultLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  toolResultText: { fontSize: 13, lineHeight: 18, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  inputArea: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, borderWidth: 1 },
  textInput: { flex: 1, fontSize: 16, minHeight: 34, paddingTop: 6, paddingBottom: 6, paddingHorizontal: 8 },
  attachButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  voiceButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  sendButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { backgroundColor: '#2A2A2A' }
});
