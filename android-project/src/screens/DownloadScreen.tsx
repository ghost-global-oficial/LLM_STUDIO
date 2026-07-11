import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { ArrowLeft, Download, X, Search, CloudDownload } from 'lucide-react-native';
import RNFS from 'react-native-fs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { AVAILABLE_MODELS, AIModel } from '../data/modelsData';
import { useTheme } from '../context/ThemeContext';
import { useDownload } from '../context/DownloadContext';
import { useTranslation } from '../context/SettingsContext';

const MODELS_DIR = `${RNFS.DocumentDirectoryPath}/models/`;

type Props = NativeStackScreenProps<RootStackParamList, 'Download'>;

export default function DownloadScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const { activeDownload, startDownload, cancelDownload } = useDownload();
  const { t } = useTranslation();
  const [localModels, setLocalModels] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [externalResults, setExternalResults] = useState<AIModel[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const searchTimeout = useRef<any>(null);

  const fetchInstalled = async () => {
    try {
      const exists = await RNFS.exists(MODELS_DIR);
      if (exists) {
        const names: string[] = [];
        const scanDir = async (dirPath: string) => {
          const entries = await RNFS.readDir(dirPath);
          for (const entry of entries) {
            if (entry.isDirectory()) {
              await scanDir(entry.path);
            } else if (entry.name.toLowerCase().endsWith('.gguf')) {
              names.push(entry.name);
            }
          }
        };
        await scanDir(MODELS_DIR);
        setLocalModels(names);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInstalled();
  }, []);

  useEffect(() => {
    if (activeDownload?.status === 'completed') {
      fetchInstalled();
    }
  }, [activeDownload?.status]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (searchQuery.length < 3) {
      setExternalResults([]);
      return;
    }

    const getModelFileSize = async (modelId: string): Promise<{ size: string, downloadUrl: string }> => {
      try {
        const response = await fetch(`https://huggingface.co/api/models/${modelId}`);
        if (!response.ok) throw new Error('Model not found');
        const data = await response.json();
        let downloadUrl = '';
        let totalSize = 0;
        if (data.siblings) {
          const ggufFiles = data.siblings.filter((f: any) => f.rfilename && f.rfilename.endsWith('.gguf'));
          if (ggufFiles.length > 0) {
            const ggufFile = ggufFiles.find((f: any) => f.rfilename.toLowerCase().includes('q4_k_m'))
              || ggufFiles.find((f: any) => f.rfilename.toLowerCase().includes('q4_k'))
              || ggufFiles.find((f: any) => f.rfilename.toLowerCase().includes('q4_0'))
              || ggufFiles[0];
            downloadUrl = `https://huggingface.co/${modelId}/resolve/main/${encodeURIComponent(ggufFile.rfilename)}?download=true`;
            if (ggufFile.size) {
              totalSize = ggufFile.size;
            } else {
              // Try to get size from cardData.safetensors or other metadata
              for (const f of ggufFiles) {
                if (f.size) totalSize += f.size;
              }
            }
          }
        }
        const sizeStr = totalSize > 0
          ? (totalSize / 1024 / 1024 / 1024).toFixed(1) + ' GB'
          : 'N/A';
        return { size: sizeStr, downloadUrl };
      } catch {
        return { size: 'N/A', downloadUrl: '' };
      }
    };

    searchTimeout.current = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const response = await fetch(
          `https://huggingface.co/api/models?search=${searchQuery}&filter=gguf&sort=downloads&direction=-1&limit=25`
        );
        const data = await response.json();

        const mapped: AIModel[] = await Promise.all(
          data.map(async (m: any) => {
            const { size: fileSize, downloadUrl: resolvedUrl } = await getModelFileSize(m.id);
            return {
              id: m.id,
              name: m.id.split('/').pop(),
              size: fileSize,
              downloadUrl: resolvedUrl
            };
          })
        );

        setExternalResults(mapped);
      } catch (err) {
        console.log("HF Search error", err);
      } finally {
        setLoadingSearch(false);
      }
    }, 600);

    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery]);

  const isModelInstalled = (modelId: string) => {
    const safeId = modelId.replace(/\//g, '_').toLowerCase();
    return localModels.some(local => local.toLowerCase().includes(safeId));
  };

  const isCurrentlyDownloading = (modelId: string) => {
    if (!activeDownload || activeDownload.status !== 'downloading') return false;
    return activeDownload.name.includes(modelId.replace(/\//g, '_')) || activeDownload.name.toLowerCase().includes(modelId.split('/').pop()?.toLowerCase() || '');
  };

  const localFiltered = AVAILABLE_MODELS.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const combinedData = searchQuery.length >= 3
    ? [...localFiltered, ...externalResults.filter(ext => !localFiltered.some(loc => loc.id === ext.id))]
    : localFiltered;

  const downloadModel = async (model: AIModel) => {
    if (!model.downloadUrl) {
      Alert.alert(t('urlNotFound'), t('urlNotFoundDesc'));
      return;
    }
    const safeId = model.id.replace(/\//g, '_');
    const destinationPath = `${MODELS_DIR}${safeId}.gguf`;
    await startDownload(model.name, model.downloadUrl, destinationPath);
  };

  const bgColor = isDark ? '#0F0F0F' : '#F5F5F5';
  const headerBg = isDark ? '#0F0F0F' : '#F5F5F5';
  const headerBorder = isDark ? '#1A1A1A' : '#E0E0E0';
  const textColor = isDark ? '#FFF' : '#000';
  const secondaryText = isDark ? '#888' : '#666';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const inputBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const inputBorder = isDark ? '#333' : '#E0E0E0';
  const placeholderColor = isDark ? '#888' : '#999';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: cardBg }]} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={textColor} />
        </TouchableOpacity>
        <View style={[styles.headerSearchContainer, { backgroundColor: inputBg, borderColor: inputBorder }]}>
          <Search size={18} color={placeholderColor} style={styles.searchIcon} />
          <TextInput
            style={[styles.headerSearchInput, { color: textColor }]}
            placeholder={t('searchModels')}
            placeholderTextColor={placeholderColor}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.content}>
        {activeDownload?.status === 'downloading' && (
          <View style={[styles.activeDownloadCard, { backgroundColor: cardBg, borderColor: inputBorder }]}>
            <CloudDownload size={20} color="#007AFF" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.activeDownloadName, { color: textColor }]} numberOfLines={1}>{activeDownload.name}</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${activeDownload.progress * 100}%` }]} />
              </View>
              <Text style={[styles.activeDownloadStatus, { color: secondaryText }]}>{Math.round(activeDownload.progress * 100)}% {t('downloading')}</Text>
            </View>
            <TouchableOpacity onPress={cancelDownload}>
              <X size={18} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={combinedData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <ActivityIndicator size="large" color="#007AFF" animating={loadingSearch} />
              <Text style={{ color: secondaryText, marginTop: 10 }}>
                {loadingSearch ? t('searching') : t('searchHint')}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const installed = isModelInstalled(item.id);
            const downloading = isCurrentlyDownloading(item.id);

            return (
              <TouchableOpacity
                style={[styles.modelItem, { backgroundColor: cardBg, borderColor: inputBorder }, (installed || downloading) && { opacity: 0.5 }]}
                onPress={() => !installed && !downloading && downloadModel(item)}
                disabled={installed || downloading}
              >
                <View style={{ flex: 1, paddingRight: 15 }}>
                  <Text style={[styles.modelItemName, { color: textColor }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.modelItemSize, { color: secondaryText }]}>
                    {installed ? `✓ ${t('downloaded')}` : downloading ? t('downloading') : `${t('size')}: ${item.size}`}
                  </Text>
                </View>
                {installed ? <X size={24} color={secondaryText} /> : downloading ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <View style={styles.downloadBtn}>
                    <Download size={20} color="#007AFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 15,
    borderBottomWidth: 1
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, padding: 15 },
  headerSearchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingHorizontal: 12, marginLeft: 15, height: 40,
    borderWidth: 1
  },
  searchIcon: { marginRight: 8 },
  headerSearchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  activeDownloadCard: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12,
    marginBottom: 15, borderWidth: 1,
  },
  activeDownloadName: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  activeDownloadStatus: { fontSize: 11, marginTop: 2 },
  modelItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 16, marginBottom: 10,
    borderWidth: 1
  },
  modelItemName: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  modelItemSize: { fontSize: 13 },
  downloadBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0, 122, 255, 0.1)', alignItems: 'center', justifyContent: 'center' },
  progressBarBg: { height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  progressBarFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 2 },
});
