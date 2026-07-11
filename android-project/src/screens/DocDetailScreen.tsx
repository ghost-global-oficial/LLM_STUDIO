import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface DocSection {
  title: string;
  content: string;
  tips?: string[];
}

interface DocDetailScreenProps {
  navigation: any;
  route: {
    params: {
      title: string;
      sections: DocSection[];
    };
  };
}

export default function DocDetailScreen({ navigation, route }: DocDetailScreenProps) {
  const { isDark } = useTheme();
  const { title, sections } = route.params;

  const bgColor = isDark ? '#0F0F0F' : '#F5F5F5';
  const textColor = isDark ? '#FFF' : '#000';
  const secondaryText = isDark ? '#888' : '#666';
  const cardBg = isDark ? '#161616' : '#FFFFFF';
  const cardBorder = isDark ? '#222' : '#E0E0E0';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { backgroundColor: bgColor }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: '#1E1E1E' }]} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {sections.map((section, index) => (
          <View key={index} style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{section.title}</Text>
            <Text style={[styles.sectionContent, { color: secondaryText }]}>{section.content}</Text>
            {section.tips && section.tips.length > 0 && (
              <View style={[styles.tipsContainer, { borderTopColor: cardBorder }]}>
                <Text style={[styles.tipsTitle, { color: textColor }]}>Dicas</Text>
                {section.tips.map((tip, i) => (
                  <Text key={i} style={[styles.tipText, { color: secondaryText }]}>• {tip}</Text>
                ))}
              </View>
            )}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    paddingTop: 50,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 15,
    lineHeight: 24,
  },
  tipsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
});
