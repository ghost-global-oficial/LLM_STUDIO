import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { FileText, Cpu, Globe, Rocket, HelpCircle, ChevronRight, Zap } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/SettingsContext';

export default function DocsScreen() {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const bgColor = isDark ? '#0F0F0F' : '#F5F5F5';
  const textColor = isDark ? '#FFF' : '#000';
  const secondaryText = isDark ? '#888' : '#666';
  const cardBg = isDark ? '#161616' : '#FFFFFF';
  const cardBorder = isDark ? '#222' : '#E0E0E0';
  const quickBg = isDark ? '#1E1E1E' : '#FFFFFF';

  const sections = [
    {
      title: t('docGguf'),
      icon: <Cpu size={24} color="#FF9500" />,
      content: t('docGgufDesc'),
      link: 'https://huggingface.co/models?search=gguf'
    },
    {
      title: t('docServer'),
      icon: <Globe size={24} color="#34C759" />,
      content: t('docServerDesc'),
      link: 'https://github.com/ghost-global-oficial/LLM_STUDIO/wiki'
    },
    {
      title: t('docPerformance'),
      icon: <Zap size={24} color="#5856D6" />,
      content: t('docPerformanceDesc'),
      link: 'https://github.com/ghost-global-oficial/LLM_STUDIO/wiki'
    },
    {
      title: t('docSkills'),
      icon: <Rocket size={24} color="#007AFF" />,
      content: t('docSkillsDesc'),
      link: 'https://github.com/ghost-global-oficial/LLM_STUDIO/wiki'
    }
  ];

  const DocCard = ({ title, icon, content, link }: any) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
      onPress={() => Linking.openURL(link)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>{icon}</View>
        <Text style={[styles.cardTitle, { color: textColor }]}>{title}</Text>
      </View>
      <Text style={[styles.cardContent, { color: secondaryText }]}>{content}</Text>
      <View style={[styles.cardFooter, { borderTopColor: cardBorder }]}>
        <Text style={styles.learnMore}>{t('learnMore')}</Text>
        <ChevronRight size={16} color="#007AFF" />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: bgColor }]} contentContainerStyle={[styles.content, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <FileText size={32} color={textColor} />
        <Text style={[styles.headerTitle, { color: textColor }]}>{t('helpCenter')}</Text>
        <Text style={[styles.headerSubtitle, { color: secondaryText }]}>{t('helpDesc')}</Text>
      </View>

      <View style={[styles.quickStart, { backgroundColor: quickBg, borderColor: cardBorder }]}>
        <View style={[styles.quickIcon, { backgroundColor: '#007AFF' }]}>
          <HelpCircle size={20} color="#FFF" />
        </View>
        <View style={styles.quickTextContainer}>
          <Text style={[styles.quickTitle, { color: textColor }]}>{t('quickStart')}</Text>
          <Text style={[styles.quickDesc, { color: secondaryText }]}>{t('quickStartDesc')}</Text>
        </View>
      </View>

      {sections.map((section, index) => (
        <DocCard key={index} {...section} />
      ))}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: textColor }]}>LLM Studio v1.0.0</Text>
        <Text style={[styles.footerSubtext, { color: secondaryText }]}>{t('docFooter')}</Text>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 60 },
  header: { marginBottom: 30 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginTop: 10 },
  headerSubtitle: { fontSize: 16, marginTop: 5 },
  quickStart: {
    flexDirection: 'row', padding: 20, borderRadius: 20,
    marginBottom: 25, borderWidth: 1, alignItems: 'center'
  },
  quickIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  quickTextContainer: { flex: 1 },
  quickTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  quickDesc: { fontSize: 13, lineHeight: 18 },
  card: { borderRadius: 24, padding: 24, marginBottom: 20, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  iconContainer: { marginRight: 12 },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  cardContent: { fontSize: 14, lineHeight: 22, marginBottom: 20 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: 15 },
  learnMore: { color: '#007AFF', fontWeight: 'bold', marginRight: 5, fontSize: 14 },
  footer: { marginTop: 20, alignItems: 'center', opacity: 0.5 },
  footerText: { fontSize: 12 },
  footerSubtext: { fontSize: 10, marginTop: 4 }
});
