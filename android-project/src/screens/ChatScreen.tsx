import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from 'react-native';
import { ArrowLeft, Bot, ArrowUp, Paperclip, Mic } from 'lucide-react-native';
import { initLlama, LlamaContext } from 'llama.rn';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

export default function ChatScreen({ route, navigation }: Props) {
  const { isDark } = useTheme();
  const { fileUri, fileName } = route.params;
  const [modelReady, setModelReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: `Conectado ao modelo ${fileName}. Teste dizendo um Oi!`, isUser: false }
  ]);
  const [inputText, setInputText] = useState('');
  const llamaContext = useRef<LlamaContext | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    let active = true;
    const startLlamaSession = async () => {
      try {
        setLoading(true);
        if (llamaContext.current) {
          await llamaContext.current.release();
        }

        // No Android o C++ precisa do caminho absoluto limpo em vez da URI do Expo
        const absolutePath = fileUri.replace('file://', '');

        llamaContext.current = await initLlama({
          model: absolutePath,
          use_mlock: false, // Desabilitado para evitar falhas de permissão de memória no Android
          n_ctx: 1024,
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
            'Erro do Expo Go',
            'Sua dependência "llama.rn" não conseguiu achar o código nativo (C++). Isso ocorre porque você está rodando pelo app padrão do Expo Go, que não roda módulos nativos.\n\nPara consertar, feche o Expo e rode no terminal:\nnpx expo prebuild --platform android\nnpx expo run:android',
            [{ text: 'Entendi', onPress: () => navigation.goBack() }]
          );
        } else {
          Alert.alert('Erro fatal no modelo', String(error));
        }
      }
    };
    startLlamaSession();

    return () => {
      active = false;
      if (llamaContext.current) {
        llamaContext.current.release().catch(() => {});
      }
    };
  }, [fileUri]);

  const sendMessage = async () => {
    console.log('Botão Enviar pressionado com texto:', inputText);

    if (!inputText.trim()) {
       return Alert.alert('Aviso', 'Escreva algo antes de enviar!');
    }

    if (!llamaContext.current) {
       return Alert.alert('Erro', 'O modelo ainda não foi carregado corretamente na memória do celular.');
    }

    const userMsg: Message = { id: Date.now().toString(), text: inputText, isUser: true };
    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: Message = { id: aiMsgId, text: '', isUser: false };

    // Adiciona User e Placeholder IA de uma só vez para evitar bugs de render
    setMessages(prev => [...prev, userMsg, aiMsg]);

    const promptToSend = inputText;
    setInputText('');
    setLoading(true);

    try {
      // Build conversation context using current messages state
      const currentMessages = messages;
      let fullContext = "";
      currentMessages.forEach(msg => {
        if (msg.id !== '1' && msg.text !== '') {
           fullContext += msg.isUser ? `<|user|>\n${msg.text} <|end|>\n` : `<|assistant|>\n${msg.text} <|end|>\n`;
        }
      });
      fullContext += `<|user|>\n${promptToSend} <|end|>\n<|assistant|>\n`;

      console.log('--- PROMPT ENVIADO ---');

      let hasStarted = false;

      const response = await llamaContext.current.completion({
        prompt: fullContext,
        n_predict: 500,
        stop: [" <|end|>", "<|", "User:", "Assistant:"]
      }, (data: any) => {
        if (!data) return;

        // Tenta capturar o texto de diversas propriedades comuns em diferentes versões da lib
        let tokenText = "";
        if (typeof data === 'string') {
          tokenText = data;
        } else {
          tokenText = data.token || data.text || data.content || data.choices?.[0]?.delta?.content || "";
        }

        if (!hasStarted && tokenText.trim() !== "") {
          setLoading(false);
          hasStarted = true;
        }

        if (tokenText) {
          setMessages(prev => prev.map(m =>
            m.id === aiMsgId ? { ...m, text: m.text + tokenText } : m
          ));
        }
      });

      // Fallback final: se o stream falhou mas o response final tem texto
      setMessages(prev => prev.map(m => {
        if (m.id === aiMsgId && m.text === "") {
          const finalResult = response?.text || response?.content || "";
          return { ...m, text: finalResult || "A IA não retornou resposta." };
        }
        return m;
      }));
    } catch (error: any) {
      console.error('Inference crash:', error);
      Alert.alert('Erro no Motor', 'A IA parou de responder: ' + (error.message || 'Erro desconhecido'));
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

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: bgColor }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header Modal com Botao de Voltar */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: isDark ? '#1E1E1E' : '#E0E0E0' }]} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>{fileName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            {!modelReady && <ActivityIndicator size="small" color="#007AFF" style={{ marginRight: 6 }} />}
            <Text style={[styles.headerSubtitle, { color: secondaryText }]}>{modelReady ? 'Online - Memória Local' : 'Injetando na Memória...'}</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <View key={msg.id} style={[styles.messageWrapper, msg.isUser ? styles.messageWrapperUser : styles.messageWrapperAI]}>
            {!msg.isUser && (
              <View style={[styles.avatarAI, { backgroundColor: avatarBg, borderColor: bubbleBorder }]}>
                <Bot size={16} color={textColor} strokeWidth={2.5} />
              </View>
            )}
            <View style={[styles.messageBubble, msg.isUser ? styles.userMessage : styles.aiMessage, { backgroundColor: bubbleBg, borderColor: bubbleBorder }]}>
              <Text style={[styles.messageText, { color: textColor }]}>
                {msg.text}
              </Text>
            </View>
          </View>
        ))}
        {loading && modelReady && (
          <View style={[styles.messageWrapper, styles.messageWrapperAI]}>
            <View style={[styles.avatarAI, { backgroundColor: avatarBg, borderColor: bubbleBorder }]}>
              <Bot size={16} color={textColor} strokeWidth={2.5} />
            </View>
            <View style={[styles.messageBubble, styles.aiMessage, { backgroundColor: bubbleBg, borderColor: bubbleBorder, flexDirection: 'row', alignItems: 'center' }]}>
               <ActivityIndicator size="small" color={secondaryText} style={{ marginRight: 8 }} />
               <Text style={[styles.messageText, { color: secondaryText, fontStyle: 'italic' }]}>
                  Processando modelo e gerando texto...
               </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputArea, { backgroundColor: inputAreaBg }]}>
        <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: inputBorder }]}>
          <TouchableOpacity style={styles.attachButton} onPress={() => Alert.alert('Arquivos', 'Seletor de arquivos em breve.')}>
             <Paperclip size={20} color={placeholderColor} />
          </TouchableOpacity>
          <TextInput
            style={[styles.textInput, { color: textColor }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={modelReady ? "Escreva sua mensagem..." : "Aguarde o carregamento..."}
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
  inputArea: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, borderWidth: 1 },
  textInput: { flex: 1, fontSize: 16, maxHeight: 120, minHeight: 34, paddingTop: 6, paddingBottom: 6, paddingHorizontal: 8 },
  attachButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  voiceButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  sendButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { backgroundColor: '#2A2A2A' }
});
