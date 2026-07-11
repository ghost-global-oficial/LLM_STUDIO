import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ArrowLeft, Clock, Trash2, MessageCircle } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/SettingsContext';
import RNFS from 'react-native-fs';

const HISTORY_DIR = `${RNFS.DocumentDirectoryPath}/chat_history`;

interface ChatHistoryItem {
  id: string;
  fileName: string;
  messages: { id: string; text: string; isUser: boolean }[];
  savedAt: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'ChatHistory'>;

export default function ChatHistoryScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);

  const bgColor = isDark ? '#0F0F0F' : '#F5F5F5';
  const textColor = isDark ? '#FFF' : '#000';
  const secondaryText = isDark ? '#888' : '#666';
  const cardBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const borderColor = isDark ? '#333' : '#E0E0E0';

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
      const exists = await RNFS.exists(HISTORY_DIR);
      if (!exists) return;
      const files = await RNFS.readDir(HISTORY_DIR);
      const jsonFiles = files.filter(f => f.name.endsWith('.json'));
      const items: ChatHistoryItem[] = [];
      for (const file of jsonFiles) {
        try {
          const raw = await RNFS.readFile(file.path, 'utf8');
          items.push(JSON.parse(raw));
        } catch {}
      }
      items.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      setHistory(items);
    } catch {}
  };

  const deleteHistory = (id: string) => {
    Alert.alert(t('remove'), 'Are you sure?', [
      { text: t('cancel') },
      {
        text: t('remove'), style: 'destructive', onPress: async () => {
          try {
            await RNFS.unlink(`${HISTORY_DIR}/${id}.json`);
            setHistory(prev => prev.filter(h => h.id !== id));
          } catch {}
        }
      },
    ]);
  };

  const openChat = (item: ChatHistoryItem) => {
    navigation.navigate('Chat', {
      fileUri: '',
      fileName: item.fileName,
      loadHistory: item,
    });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: isDark ? '#1E1E1E' : '#E0E0E0' }]} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>{t('chatHistory')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Clock size={48} color={secondaryText} />
            <Text style={[styles.emptyText, { color: secondaryText }]}>{t('noHistory')}</Text>
          </View>
        ) : (
          history.map(item => {
            const userMsgs = item.messages.filter(m => m.isUser);
            const lastMsg = item.messages.filter(m => !m.isUser).slice(-1)[0];
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, { backgroundColor: cardBg, borderColor }]}
                onPress={() => openChat(item)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIcon, { backgroundColor: isDark ? '#FFF15' : 'rgba(0,0,0,0.06)' }]}>
                    <MessageCircle size={20} color={isDark ? '#FFF' : '#333'} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={1}>{item.fileName}</Text>
                    <Text style={[styles.cardDate, { color: secondaryText }]}>
                      {formatDate(item.savedAt)} · {userMsgs.length} {t('messages')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteHistory(item.id)} style={styles.deleteBtn}>
                    <Trash2 size={18} color="#F44336" />
                  </TouchableOpacity>
                </View>
                {lastMsg && (
                  <Text style={[styles.cardPreview, { color: secondaryText }]} numberOfLines={2}>
                    {lastMsg.text}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 15,
    paddingTop: 50, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  content: { padding: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, marginTop: 16 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardDate: { fontSize: 12, marginTop: 2 },
  cardPreview: { fontSize: 13, marginTop: 10, lineHeight: 18 },
  deleteBtn: { padding: 8 },
});
