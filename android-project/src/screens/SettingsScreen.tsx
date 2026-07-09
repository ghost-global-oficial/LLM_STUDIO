import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch, ScrollView, Linking } from 'react-native';
import { Moon, Sun, ArrowLeft, ExternalLink } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface SettingsScreenProps {
  navigation: any;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { toggleTheme, isDark } = useTheme();

  const arrowColor = isDark ? '#FFF' : '#FFF';
  const backBtnBg = isDark ? '#1E1E1E' : '#1E1E1E';

  return (
    <View style={[styles.container, isDark ? styles.darkContainer : styles.lightContainer]}>
      <View style={[styles.header, isDark ? styles.darkHeader : styles.lightHeader]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: backBtnBg }]} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={arrowColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark ? styles.darkText : styles.lightText]}>Configuracoes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={[styles.section, isDark ? styles.darkSection : styles.lightSection]}>
            <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Aparencia</Text>
            
            <View style={[styles.settingItem, isDark ? styles.darkSettingItem : styles.lightSettingItem]}>
              <View style={styles.settingInfo}>
                {isDark ? (
                  <Moon size={22} color={isDark ? '#FFF' : '#000'} style={{ marginRight: 12 }} />
                ) : (
                  <Sun size={22} color={isDark ? '#FFF' : '#000'} style={{ marginRight: 12 }} />
                )}
                <View>
                  <Text style={[styles.settingLabel, isDark ? styles.darkText : styles.lightText]}>Tema Escuro</Text>
                  <Text style={[styles.settingDescription, isDark ? styles.darkSecondaryText : styles.lightSecondaryText]}>
                    {isDark ? 'Ativado' : 'Desativado'}
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
            <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Creditos</Text>
            
            <View style={[styles.creditItem, { borderBottomColor: isDark ? '#2A2A2A' : '#E0E0E0' }]}>
              <View style={styles.creditRow}>
                <Text style={[styles.creditLabel, isDark ? styles.darkText : styles.lightText]}>Desenvolvido por</Text>
              </View>
              <View style={styles.creditRow}>
                <Text style={[styles.creditValue, { color: '#007AFF' }]}>Ghost Systems</Text>
                <ExternalLink size={14} color="#007AFF" style={{ marginLeft: 6 }} />
              </View>
            </View>

            <View style={[styles.creditItem, { borderBottomWidth: 0 }]}>
              <View style={styles.creditRow}>
                <Text style={[styles.creditLabel, isDark ? styles.darkSecondaryText : styles.lightSecondaryText]}>Versao 1.0.0</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
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
  darkSecondaryText: {
    color: '#888',
  },
  lightSecondaryText: {
    color: '#666',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
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
});
