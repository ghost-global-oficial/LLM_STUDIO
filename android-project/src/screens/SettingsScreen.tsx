import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch, ScrollView, TextInput, Modal, FlatList, Platform, NativeModules } from 'react-native';
import { Moon, Sun, ArrowLeft, ExternalLink, Globe, MessageSquare, Cpu } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useSettings, useTranslation, LANGUAGES, Language } from '../context/SettingsContext';

interface SettingsScreenProps {
  navigation: any;
}

const LANGUAGE_LIST = Object.entries(LANGUAGES).map(([code, name]) => ({ code: code as Language, name }));

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { toggleTheme, isDark } = useTheme();
  const { language, setLanguage, systemPrompt, setSystemPrompt } = useSettings();
  const { t } = useTranslation();
  const [showLangModal, setShowLangModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showHwModal, setShowHwModal] = useState(false);
  const [promptText, setPromptText] = useState(systemPrompt);

  const [hwInfo, setHwInfo] = useState({
    ram: '...',
    vram: '...',
    cpu: '...',
    gpu: '...',
  });

  useEffect(() => {
    const getHardwareInfo = async () => {
      try {
        const DeviceModule = NativeModules.DeviceModule;
        if (DeviceModule && DeviceModule.getHardwareInfo) {
          const info = await DeviceModule.getHardwareInfo();
          setHwInfo({
            ram: info.ram || 'N/A',
            vram: info.vram || 'N/A',
            cpu: info.cpu || 'N/A',
            gpu: info.gpu || 'N/A',
          });
        }
      } catch (e) {}
    };
    getHardwareInfo();
  }, []);

  const arrowColor = isDark ? '#FFF' : '#FFF';
  const backBtnBg = isDark ? '#1E1E1E' : '#1E1E1E';

  const handleSavePrompt = () => {
    setSystemPrompt(promptText);
    setShowPromptModal(false);
  };

  return (
    <View style={[styles.container, isDark ? styles.darkContainer : styles.lightContainer]}>
      <View style={[styles.header, isDark ? styles.darkHeader : styles.lightHeader]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: backBtnBg }]} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={arrowColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark ? styles.darkText : styles.lightText]}>{t('settings')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={[styles.section, isDark ? styles.darkSection : styles.lightSection]}>
            <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>{t('general')}</Text>

            <TouchableOpacity
              style={[styles.settingItem, isDark ? styles.darkSettingItem : styles.lightSettingItem]}
              onPress={() => setShowLangModal(true)}
            >
              <View style={styles.settingInfo}>
                <Globe size={22} color={isDark ? '#FFF' : '#000'} style={{ marginRight: 12 }} />
                <View>
                  <Text style={[styles.settingLabel, isDark ? styles.darkText : styles.lightText]}>{t('language')}</Text>
                  <Text style={[styles.settingDescription, isDark ? styles.darkSecondaryText : styles.lightSecondaryText]}>
                    {LANGUAGES[language]}
                  </Text>
                </View>
              </View>
              <Text style={{ color: isDark ? '#888' : '#666', fontSize: 18 }}>{'>'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, isDark ? styles.darkSettingItem : styles.lightSettingItem, { borderBottomWidth: 0 }]}
              onPress={() => { setPromptText(systemPrompt); setShowPromptModal(true); }}
            >
              <View style={styles.settingInfo}>
                <MessageSquare size={22} color={isDark ? '#FFF' : '#000'} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, isDark ? styles.darkText : styles.lightText]}>{t('systemPrompt')}</Text>
                  <Text style={[styles.settingDescription, isDark ? styles.darkSecondaryText : styles.lightSecondaryText]} numberOfLines={2}>
                    {t('systemPromptDesc')}
                  </Text>
                </View>
              </View>
              <Text style={{ color: isDark ? '#888' : '#666', fontSize: 18 }}>{'>'}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.section, isDark ? styles.darkSection : styles.lightSection]}>
            <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>{t('appearance')}</Text>

            <View style={[styles.settingItem, isDark ? styles.darkSettingItem : styles.lightSettingItem, { borderBottomWidth: 0 }]}>
              <View style={styles.settingInfo}>
                {isDark ? (
                  <Moon size={22} color={isDark ? '#FFF' : '#000'} style={{ marginRight: 12 }} />
                ) : (
                  <Sun size={22} color={isDark ? '#FFF' : '#000'} style={{ marginRight: 12 }} />
                )}
                <View>
                  <Text style={[styles.settingLabel, isDark ? styles.darkText : styles.lightText]}>{t('darkTheme')}</Text>
                  <Text style={[styles.settingDescription, isDark ? styles.darkSecondaryText : styles.lightSecondaryText]}>
                    {isDark ? t('enabled') : t('disabled')}
                  </Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#767577', true: '#3b82f6' }}
                thumbColor={isDark ? '#FFF' : '#f4f3f4'}
              />
            </View>
          </View>

          <View style={[styles.section, isDark ? styles.darkSection : styles.lightSection]}>
            <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>{t('hardware')}</Text>

            <TouchableOpacity
              style={[styles.settingItem, isDark ? styles.darkSettingItem : styles.lightSettingItem, { borderBottomWidth: 0 }]}
              onPress={() => setShowHwModal(true)}
            >
              <View style={styles.settingInfo}>
                <Cpu size={22} color={isDark ? '#FFF' : '#000'} style={{ marginRight: 12 }} />
                <View>
                  <Text style={[styles.settingLabel, isDark ? styles.darkText : styles.lightText]}>{t('hardware')}</Text>
                  <Text style={[styles.settingDescription, isDark ? styles.darkSecondaryText : styles.lightSecondaryText]}>
                    {hwInfo.cpu !== '...' ? `${hwInfo.ram} RAM | ${hwInfo.cpu}` : t('loading')}
                  </Text>
                </View>
              </View>
              <Text style={{ color: isDark ? '#888' : '#666', fontSize: 18 }}>{'>'}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.section, isDark ? styles.darkSection : styles.lightSection]}>
            <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>{t('credits')}</Text>

            <View style={[styles.creditItem, { borderBottomColor: isDark ? '#2A2A2A' : '#E0E0E0' }]}>
              <View style={styles.creditRow}>
                <Text style={[styles.creditLabel, isDark ? styles.darkText : styles.lightText]}>{t('developedBy')}</Text>
              </View>
              <View style={styles.creditRow}>
                <Text style={[styles.creditValue, { color: '#007AFF' }]}>Ghost Systems</Text>
                <ExternalLink size={14} color="#007AFF" style={{ marginLeft: 6 }} />
              </View>
            </View>

            <View style={[styles.creditItem, { borderBottomWidth: 0 }]}>
              <View style={styles.creditRow}>
                <Text style={[styles.creditLabel, isDark ? styles.darkSecondaryText : styles.lightSecondaryText]}>{t('version')} 1.0.0</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showLangModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark ? styles.darkSection : styles.lightSection]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText]}>{t('selectLanguage')}</Text>
              <TouchableOpacity onPress={() => setShowLangModal(false)}>
                <Text style={{ color: '#007AFF', fontSize: 16 }}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={LANGUAGE_LIST}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.langItem,
                    language === item.code && { backgroundColor: isDark ? '#2A2A2A' : '#E8F0FE' },
                    { borderBottomColor: isDark ? '#2A2A2A' : '#E0E0E0' }
                  ]}
                  onPress={() => { setLanguage(item.code); setShowLangModal(false); }}
                >
                  <Text style={[styles.langText, isDark ? styles.darkText : styles.lightText]}>{item.name}</Text>
                  {language === item.code && <Text style={{ color: '#007AFF', fontSize: 18 }}>{'✓'}</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showPromptModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark ? styles.darkSection : styles.lightSection, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText]}>{t('systemPrompt')}</Text>
              <TouchableOpacity onPress={() => setShowPromptModal(false)}>
                <Text style={{ color: '#007AFF', fontSize: 16 }}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.promptHint, isDark ? styles.darkSecondaryText : styles.lightSecondaryText]}>
              {t('systemPromptDesc')}
            </Text>
            <TextInput
              style={[styles.promptInput, isDark ? styles.darkPromptInput : styles.lightPromptInput, isDark ? styles.darkText : styles.lightText]}
              value={promptText}
              onChangeText={setPromptText}
              multiline
              textAlignVertical="top"
              placeholder="Escreve o teu system prompt..."
              placeholderTextColor={isDark ? '#666' : '#999'}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSavePrompt}>
              <Text style={styles.saveBtnText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showHwModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark ? styles.darkSection : styles.lightSection]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText]}>{t('hardware')}</Text>
              <TouchableOpacity onPress={() => setShowHwModal(false)}>
                <Text style={{ color: '#007AFF', fontSize: 16 }}>{t('close')}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.hwItem, { borderBottomColor: isDark ? '#2A2A2A' : '#E0E0E0' }]}>
              <Text style={[styles.hwLabel, isDark ? styles.darkSecondaryText : styles.lightSecondaryText]}>{t('ram')}</Text>
              <Text style={[styles.hwValue, isDark ? styles.darkText : styles.lightText]}>{hwInfo.ram}</Text>
            </View>

            <View style={[styles.hwItem, { borderBottomColor: isDark ? '#2A2A2A' : '#E0E0E0' }]}>
              <Text style={[styles.hwLabel, isDark ? styles.darkSecondaryText : styles.lightSecondaryText]}>{t('vram')}</Text>
              <Text style={[styles.hwValue, isDark ? styles.darkText : styles.lightText]}>{hwInfo.vram}</Text>
            </View>

            <View style={[styles.hwItem, { borderBottomColor: isDark ? '#2A2A2A' : '#E0E0E0' }]}>
              <Text style={[styles.hwLabel, isDark ? styles.darkSecondaryText : styles.lightSecondaryText]}>{t('processor')}</Text>
              <Text style={[styles.hwValue, isDark ? styles.darkText : styles.lightText]}>{hwInfo.cpu}</Text>
            </View>

            <View style={[styles.hwItem, { borderBottomWidth: 0 }]}>
              <Text style={[styles.hwLabel, isDark ? styles.darkSecondaryText : styles.lightSecondaryText]}>{t('gpu')}</Text>
              <Text style={[styles.hwValue, isDark ? styles.darkText : styles.lightText]}>{hwInfo.gpu}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  darkContainer: {
    backgroundColor: '#0F0F0F',
  },
  lightContainer: {
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginBottom: 20,
  },
  darkHeader: {
    backgroundColor: '#0F0F0F',
  },
  lightHeader: {
    backgroundColor: '#F5F5F5',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  darkText: {
    color: '#FFF',
  },
  lightText: {
    color: '#000',
  },
  darkSecondaryText: {
    color: '#888',
  },
  lightSecondaryText: {
    color: '#666',
  },
  content: {
    paddingHorizontal: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  darkSection: {
    backgroundColor: '#1E1E1E',
  },
  lightSection: {
    backgroundColor: '#FFF',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  darkSettingItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  lightSettingItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  scrollContent: {
    flexGrow: 1,
  },
  creditItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  creditLabel: {
    fontSize: 14,
  },
  creditValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  langItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  langText: {
    fontSize: 16,
  },
  promptHint: {
    fontSize: 13,
    marginBottom: 12,
  },
  promptInput: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 150,
    maxHeight: 300,
  },
  darkPromptInput: {
    backgroundColor: '#121212',
    borderColor: '#333',
    color: '#FFF',
  },
  lightPromptInput: {
    backgroundColor: '#F9F9F9',
    borderColor: '#DDD',
    color: '#000',
  },
  saveBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  hwItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  hwLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  hwValue: {
    fontSize: 16,
    fontWeight: '500',
  },
});
