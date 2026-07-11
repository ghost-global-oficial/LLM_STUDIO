import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert, Modal, Platform } from 'react-native';
import { Zap, Plus, Trash2, X, Code, Globe, Calculator, FileText, Terminal, Wrench } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/SettingsContext';
import { useSkills, Skill, SkillParameter } from '../context/SkillsContext';

const ICON_MAP: Record<string, any> = { Globe, Calculator, FileText, Terminal, Wrench, Code };

export default function SkillsScreen() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { skills, toggleSkill, deleteSkill, saveSkill, updateSkill } = useSkills();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [handlerCode, setHandlerCode] = useState('');
  const [paramName, setParamName] = useState('');
  const [paramType, setParamType] = useState<'string' | 'number' | 'boolean'>('string');
  const [paramDesc, setParamDesc] = useState('');
  const [paramRequired, setParamRequired] = useState(true);
  const [params, setParams] = useState<SkillParameter[]>([]);

  const bgColor = isDark ? '#0F0F0F' : '#F5F5F5';
  const cardBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const textColor = isDark ? '#FFF' : '#000';
  const secondaryText = isDark ? '#888' : '#666';
  const borderColor = isDark ? '#333' : '#E0E0E0';
  const inputBg = isDark ? '#1E1E1E' : '#F0F0F0';

  const openNewSkill = () => {
    setEditingSkill(null);
    setName('');
    setDescription('');
    setHandlerCode('return { result: params };');
    setParams([]);
    setIsModalVisible(true);
  };

  const openEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setName(skill.name);
    setDescription(skill.description);
    setHandlerCode(skill.handlerCode);
    setParams([...skill.parameters]);
    setIsModalVisible(true);
  };

  const addParam = () => {
    if (!paramName.trim()) return;
    setParams(prev => [...prev, { name: paramName.trim(), type: paramType, description: paramDesc, required: paramRequired }]);
    setParamName('');
    setParamDesc('');
  };

  const removeParam = (index: number) => {
    setParams(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveSkill = async () => {
    if (!name.trim()) return Alert.alert(t('error'), t('nameRequired'));
    if (!handlerCode.trim()) return Alert.alert(t('error'), t('codeRequired'));

    const iconNames = Object.keys(ICON_MAP);
    const randomIcon = iconNames[Math.floor(Math.random() * iconNames.length)];

    if (editingSkill) {
      await updateSkill({
        ...editingSkill,
        name: name.trim(),
        description: description.trim(),
        handlerCode,
        parameters: params,
      });
    } else {
      await saveSkill({
        id: `custom_${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        enabled: true,
        icon: randomIcon,
        parameters: params,
        handlerCode,
      });
    }
    setIsModalVisible(false);
  };

  const handleDeleteSkill = (id: string) => {
    Alert.alert(t('remove'), 'Are you sure?', [
      { text: t('cancel') },
      { text: t('remove'), style: 'destructive', onPress: () => deleteSkill(id) },
    ]);
  };

  const getIcon = (iconName: string) => ICON_MAP[iconName] || Zap;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: textColor }]}>{t('skills')}</Text>
            <Text style={[styles.subtitle, { color: secondaryText }]}>{t('toolsFC')}</Text>
          </View>
          <TouchableOpacity onPress={openNewSkill} style={styles.addButton}>
            <Plus size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { color: secondaryText }]}>
          {skills.filter(s => s.enabled).length} {t('activeOf')} {skills.length} — {t('availableFor')}
        </Text>

        {skills.map(skill => {
          const Icon = getIcon(skill.icon);
          return (
            <View key={skill.id} style={[styles.skillCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.skillHeader}>
                <View style={styles.skillIcon}>
                  <Icon size={22} color={skill.enabled ? '#007AFF' : secondaryText} />
                </View>
                <View style={styles.skillInfo}>
                  <Text style={[styles.skillName, { color: textColor }]}>{skill.name}</Text>
                  <Text style={[styles.skillDesc, { color: secondaryText }]} numberOfLines={2}>{skill.description}</Text>
                  <Text style={[styles.skillParams, { color: isDark ? '#555' : '#999' }]}>
                    {skill.parameters.length} param(s) · {skill.handlerCode.split('\n').length} lines
                  </Text>
                </View>
                <Switch value={skill.enabled} onValueChange={() => toggleSkill(skill.id)} trackColor={{ false: '#333', true: '#007AFF' }} />
              </View>
              <View style={styles.skillActions}>
                <TouchableOpacity onPress={() => openEditSkill(skill)} style={[styles.actionBtn, { borderColor }]}>
                  <Text style={[styles.actionText, { color: '#007AFF' }]}>{t('edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteSkill(skill.id)} style={[styles.actionBtn, { borderColor }]}>
                  <Text style={[styles.actionText, { color: '#F44336' }]}>{t('remove')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>{editingSkill ? t('editSkill') : t('newSkill')}</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}><X size={24} color={textColor} /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: secondaryText }]}>{t('name')}</Text>
              <TextInput style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]} value={name} onChangeText={setName} placeholder={t('skillNamePlaceholder')} placeholderTextColor={isDark ? "#444" : "#999"} autoCapitalize="none" />

              <Text style={[styles.label, { color: secondaryText }]}>{t('description')}</Text>
              <TextInput style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]} value={description} onChangeText={setDescription} placeholder={t('skillDescPlaceholder')} placeholderTextColor={isDark ? "#444" : "#999"} multiline />

              <Text style={[styles.label, { color: secondaryText }]}>{t('parameters')} ({params.length})</Text>
              {params.map((p, i) => (
                <View key={i} style={[styles.paramRow, { backgroundColor: inputBg, borderColor }]}>
                  <Text style={[styles.paramText, { color: textColor }]}>{p.name} ({p.type}){p.required ? ' *' : ''}</Text>
                  <TouchableOpacity onPress={() => removeParam(i)}><Trash2 size={16} color="#F44336" /></TouchableOpacity>
                </View>
              ))}

              <View style={[styles.paramAddRow, { borderColor }]}>
                <TextInput style={[styles.paramInput, { backgroundColor: inputBg, color: textColor, borderColor }]} value={paramName} onChangeText={setParamName} placeholder={t('paramNamePlaceholder')} placeholderTextColor={isDark ? "#444" : "#999"} autoCapitalize="none" />
                <TouchableOpacity style={[styles.typeBtn, { backgroundColor: paramType === 'string' ? '#007AFF' : inputBg, borderColor }]} onPress={() => setParamType('string')}>
                  <Text style={{ color: paramType === 'string' ? '#FFF' : textColor, fontSize: 11 }}>str</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.typeBtn, { backgroundColor: paramType === 'number' ? '#007AFF' : inputBg, borderColor }]} onPress={() => setParamType('number')}>
                  <Text style={{ color: paramType === 'number' ? '#FFF' : textColor, fontSize: 11 }}>num</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.typeBtn, { backgroundColor: paramType === 'boolean' ? '#007AFF' : inputBg, borderColor }]} onPress={() => setParamType('boolean')}>
                  <Text style={{ color: paramType === 'boolean' ? '#FFF' : textColor, fontSize: 11 }}>bool</Text>
                </TouchableOpacity>
                <Switch value={paramRequired} onValueChange={setParamRequired} style={{ transform: [{ scaleX: 0.6 }, { scaleY: 0.6 }], marginHorizontal: 4 }} />
                <TouchableOpacity onPress={addParam}><Plus size={20} color="#007AFF" /></TouchableOpacity>
              </View>
              <Text style={[styles.hint, { color: secondaryText }]}>{t('required')} = toggle</Text>

              <Text style={[styles.label, { color: secondaryText }]}>{t('code')}</Text>
              <TextInput style={[styles.codeInput, { backgroundColor: inputBg, color: '#00FF00', borderColor }]} value={handlerCode} onChangeText={setHandlerCode} multiline autoCapitalize="none" placeholder={t('codePlaceholder')} placeholderTextColor="#333" />

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveSkill}>
                <Text style={styles.saveButtonText}>{editingSkill ? t('save') : t('createSkill')}</Text>
              </TouchableOpacity>
              <View style={{ height: 30 }} />
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 2 },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 13, marginBottom: 20 },
  skillCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  skillHeader: { flexDirection: 'row', alignItems: 'center' },
  skillIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#007AFF15', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  skillInfo: { flex: 1, marginRight: 12 },
  skillName: { fontSize: 16, fontWeight: '600' },
  skillDesc: { fontSize: 13, marginTop: 2 },
  skillParams: { fontSize: 11, marginTop: 4 },
  skillActions: { flexDirection: 'row', marginTop: 12, borderTopWidth: 1, borderTopColor: '#33333344', paddingTop: 10 },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, marginRight: 10 },
  actionText: { fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 50, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 16, letterSpacing: 0.5 },
  input: { padding: 14, borderRadius: 12, fontSize: 15, borderWidth: 1, marginBottom: 4 },
  paramRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  paramText: { fontSize: 13, flex: 1 },
  paramAddRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, borderWidth: 1, borderRadius: 12, padding: 8 },
  paramInput: { flex: 1, padding: 8, borderRadius: 8, fontSize: 13, borderWidth: 1, marginRight: 6 },
  typeBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, borderWidth: 1, marginHorizontal: 2, alignItems: 'center' },
  hint: { fontSize: 11, marginTop: 4, marginBottom: 4 },
  codeInput: { padding: 14, borderRadius: 12, fontSize: 13, borderWidth: 1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', minHeight: 120, textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#007AFF', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 20 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
