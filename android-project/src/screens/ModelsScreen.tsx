import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { Cpu, Plus, FolderOpen, FileText, ChevronRight, Folder, CloudDownload, X, Trash2 } from 'lucide-react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { AVAILABLE_MODELS, AIModel } from '../data/modelsData';
import { useTheme } from '../context/ThemeContext';

const MODELS_DIR = `${RNFS.DocumentDirectoryPath}/models/`;

export default function ModelsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const { isDark } = useTheme();
  const [localModels, setLocalModels] = useState<{ name: string, uri: string, size: number }[]>([]);
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);

  const loadLocalDirectory = async () => {
    try {
      const info = await RNFS.exists(MODELS_DIR);
      if (!info) {
        await RNFS.mkdir(MODELS_DIR);
      }

      const ggufFiles: { name: string, uri: string, size: number }[] = [];

      const scanDir = async (dirPath: string) => {
        const entries = await RNFS.readDir(dirPath);
        for (const entry of entries) {
          if (entry.isDirectory()) {
            await scanDir(entry.path);
          } else if (entry.name.toLowerCase().endsWith('.gguf')) {
            const fileInfo = await RNFS.stat(entry.path);
            ggufFiles.push({ name: entry.name, uri: entry.path, size: fileInfo.size || 0 });
          }
        }
      };

      await scanDir(MODELS_DIR);
      setLocalModels(ggufFiles);
    } catch (e) {
      console.log('Error reading models dir', e);
    }
  };

  const deleteModel = (uri: string, name: string) => {
    Alert.alert(
      'Eliminar Modelo',
      `Tem certeza que deseja apagar ${name}? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await RNFS.unlink(uri);
              await loadLocalDirectory();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível apagar o modelo.');
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    if (isFocused) {
      loadLocalDirectory();
    }
  }, [isFocused]);

  useEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: isDark ? '#121212' : '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTopWidth: 0,
        borderColor: isDark ? '#2A2A2A' : '#E0E0E0',
        borderWidth: 1,
        height: 70,
        elevation: 8,
        shadowColor: isDark ? '#000' : '#888',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        paddingBottom: 0,
        paddingTop: 0,
        borderBottomWidth: 0,
        display: showSelectionMenu ? 'none' : 'flex',
      }
    });
  }, [showSelectionMenu, navigation, isDark]);

  const navigateToChat = (fileUri: string, fileName: string) => {
    setShowSelectionMenu(false);
    navigation.navigate('Chat', { fileUri, fileName });
  };



  const importFromDevice = async () => {
    setShowSelectionMenu(false);
    try {
      const result = await DocumentPicker.pick({ type: [DocumentPicker.types.allFiles], copyTo: 'cachesDirectory' });
      if (!result || result.length === 0) return;

      const fileUri = result[0].uri;
      const fileName = result[0].name || 'Imported_Model.gguf';

      const info = await RNFS.exists(MODELS_DIR);
      if (!info) await RNFS.mkdir(MODELS_DIR);

      const newUri = MODELS_DIR + fileName;
      await RNFS.copyFile(fileUri, newUri);
      await loadLocalDirectory();

      Alert.alert('Sucesso', 'Modelo importado para a pasta interna com sucesso!');
    } catch (error) {
      alert('Erro ao importar modelo.');
    }
  };

  const bgColor = isDark ? '#0F0F0F' : '#F5F5F5';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const textColor = isDark ? '#FFF' : '#000';
  const secondaryText = isDark ? '#888' : '#666';
  const borderColor = isDark ? '#2A2A2A' : '#E0E0E0';
  const menuBg = isDark ? '#1E1E1E' : '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <View style={styles.headerTitleContainer}>
          <Cpu size={26} color={textColor} style={{ marginRight: 10 }} />
          <Text style={[styles.headerTitle, { color: textColor }]}>Meus Modelos</Text>
        </View>
        <TouchableOpacity style={[styles.headerButton, { backgroundColor: cardBg }]} onPress={() => setShowSelectionMenu(true)}>
          <Plus size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      {localModels.length === 0 ? (
        <View style={styles.emptyState}>
          <FolderOpen size={64} color={isDark ? '#333' : '#CCC'} />
          <Text style={[styles.emptyStateTitle, { color: textColor }]}>Nenhum modelo baixado</Text>
          <Text style={[styles.emptyStateDesc, { color: secondaryText }]}>Você pode importar do seu celular ou baixar direto do repositório público usando o botão <Text style={{ fontWeight: 'bold' }}>+</Text> acima.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16 }}
          data={localModels}
          keyExtractor={(item) => item.uri}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderColor }]}>
              <TouchableOpacity style={styles.cardMain} onPress={() => navigateToChat(item.uri, item.name)}>
                <View style={styles.cardHeader}>
                  <FileText size={32} color={textColor} />
                  <View style={styles.cardTextContainer}>
                    <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.cardSub, { color: secondaryText }]}>Local Storage: /models/ • {(item.size / 1024 / 1024).toFixed(2)} MB</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <View style={[styles.cardFooter, { borderTopColor: borderColor }]}>
                <TouchableOpacity style={styles.cardFooterAction} onPress={() => navigateToChat(item.uri, item.name)}>
                  <Text style={styles.cardLoadText}>Carregar Chat</Text>
                  <ChevronRight size={18} color="#007AFF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteModel(item.uri, item.name)}>
                  <Trash2 size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={showSelectionMenu} animationType="fade" transparent={true}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowSelectionMenu(false)}>
          <View style={[styles.menuContent, { backgroundColor: menuBg }]}>
            <View style={[styles.menuHandle, { backgroundColor: isDark ? '#333' : '#CCC' }]} />
            <Text style={[styles.menuTitle, { color: secondaryText }]}>Selecionar Origem</Text>

            <TouchableOpacity style={styles.menuOption} onPress={importFromDevice}>
              <Folder size={24} color={textColor} style={{ marginRight: 16 }} />
              <View>
                <Text style={[styles.menuOptionText, { color: textColor }]}>Importar do Dispositivo</Text>
                <Text style={[styles.menuOptionSubtext, { color: secondaryText }]}>Mover arquivo .gguf para a pasta /models</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption} onPress={() => { setShowSelectionMenu(false); navigation.navigate('Download'); }}>
              <CloudDownload size={24} color={textColor} style={{ marginRight: 16 }} />
              <View>
                <Text style={[styles.menuOptionText, { color: textColor }]}>Baixar da Hugging Face</Text>
                <Text style={[styles.menuOptionSubtext, { color: secondaryText }]}>Explorar tela de modelos populares</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 18,
    borderBottomWidth: 1,
  },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '600' },
  headerButton: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center'
  },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20 },
  emptyStateDesc: { textAlign: 'center', marginTop: 10, lineHeight: 22 },
  card: { borderRadius: 16, marginBottom: 16, borderWidth: 1, overflow: 'hidden' },
  cardMain: { padding: 20, paddingBottom: 15 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardTextContainer: { marginLeft: 15, flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  cardSub: { fontSize: 13 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  cardFooterAction: { flexDirection: 'row', alignItems: 'center' },
  cardLoadText: { color: '#007AFF', fontWeight: '500', marginRight: 4 },
  deleteButton: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,59,48,0.1)' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  menuContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  menuHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  menuTitle: { fontSize: 13, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase' },
  menuOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1 },
  menuOptionText: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  menuOptionSubtext: { fontSize: 13 }
});
