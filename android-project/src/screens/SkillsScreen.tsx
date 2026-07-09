import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert, Modal } from 'react-native';
import { Zap, Plus, Trash2, X, Code, Globe, Calculator, FileText, Terminal, Wrench } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import RNFS from 'react-native-fs';

const SKILLS_FILE = `${RNFS.DocumentDirectoryPath}skills_config.json`;

interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  required: boolean;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  parameters: SkillParameter[];
  handlerCode: string;
  icon: string;
}

const BUILTIN_SKILLS: Omit<Skill, 'id'>[] = [
  {
    name: 'web_search',
    description: 'Pesquisa na web usando DuckDuckGo',
    enabled: true,
    icon: 'Globe',
    parameters: [
      { name: 'query', type: 'string', description: 'Termo de pesquisa', required: true },
    ],
    handlerCode: `// Web search via DuckDuckGo Lite
const url = 'https://lite.duckduckgo.com/lite/?q=' + encodeURIComponent(params.query);
const resp = await fetch(url);
const html = await resp.text();
return { result: html.substring(0, 2000), query: params.query };`,
  },
  {
    name: 'calculate',
    description: 'Calculadora segura para expressões matemáticas',
    enabled: true,
    icon: 'Calculator',
    parameters: [
      { name: 'expression', type: 'string', description: 'Expressão matemática (ex: 2+2*3)', required: true },
    ],
    handlerCode: `// Safe math evaluator
const expr = params.expression.replace(/[^0-9+\-*/().]/g, '');
if (!expr) throw new Error('Invalid expression');
const result = Function('"use strict"; return (' + expr + ')')();
return { expression: params.expression, result };`,
  },
  {
    name: 'read_file',
    description: 'Lê o conteúdo de um arquivo local',
    enabled: true,
    icon: 'FileText',
    parameters: [
      { name: 'path', type: 'string', description: 'Caminho do arquivo', required: true },
    ],
    handlerCode: `const RNFS = require('react-native-fs');
const path = params.path.startsWith('/') ? params.path : RNFS.DocumentDirectoryPath + '/' + params.path;
const exists = await RNFS.exists(path);
if (!exists) throw new Error('File not found: ' + params.path);
const content = await RNFS.readFile(path, 'utf8');
return { path: params.path, content: content.substring(0, 5000), size: content.length };`,
  },
  {
    name: 'write_file',
    description: 'Escreve conteúdo em um arquivo local',
    enabled: true,
    icon: 'FileText',
    parameters: [
      { name: 'path', type: 'string', description: 'Caminho do arquivo', required: true },
      { name: 'content', type: 'string', description: 'Conteúdo a escrever', required: true },
    ],
    handlerCode: `const RNFS = require('react-native-fs');
const path = params.path.startsWith('/') ? params.path : RNFS.DocumentDirectoryPath + '/' + params.path;
await RNFS.writeFile(path, params.content, 'utf8');
return { path: params.path, written: params.content.length + ' bytes' };`,
  },
  {
    name: 'list_files',
    description: 'Lista arquivos em um diretório',
    enabled: true,
    icon: 'FileText',
    parameters: [
      { name: 'path', type: 'string', description: 'Diretório (vazio = raiz do app)', required: false },
    ],
    handlerCode: `const RNFS = require('react-native-fs');
const dir = params.path ? (params.path.startsWith('/') ? params.path : RNFS.DocumentDirectoryPath + '/' + params.path) : RNFS.DocumentDirectoryPath;
const items = await RNFS.readDir(dir);
const result = items.map(i => ({ name: i.name, isFile: i.isFile(), size: i.size }));
return { directory: dir, items: result };`,
  },
];

const ICON_MAP: Record<string, any> = { Globe, Calculator, FileText, Terminal, Wrench, Code };

export default function SkillsScreen() {
  const { isDark } = useTheme();
  const [skills, setSkills] = useState<Skill[]>([]);
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

  useEffect(() => { loadSkills(); }, []);

  const loadSkills = async () => {
    try {
      const exists = await RNFS.exists(SKILLS_FILE);
      if (exists) {
        const raw = await RNFS.readFile(SKILLS_FILE, 'utf8');
        setSkills(JSON.parse(raw));
      } else {
        const defaults = BUILTIN_SKILLS.map((s, i) => ({ ...s, id: `builtin_${i}` }));
        setSkills(defaults);
        await RNFS.writeFile(SKILLS_FILE, JSON.stringify(defaults), 'utf8');
      }
    } catch {
      const defaults = BUILTIN_SKILLS.map((s, i) => ({ ...s, id: `builtin_${i}` }));
      setSkills(defaults);
    }
  };

  const saveSkills = async (updated: Skill[]) => {
    setSkills(updated);
    await RNFS.writeFile(SKILLS_FILE, JSON.stringify(updated), 'utf8');
  };

  const toggleSkill = async (id: string) => {
    const updated = skills.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
    await saveSkills(updated);
  };

  const deleteSkill = async (id: string) => {
    Alert.alert("Remover", "Tem certeza?", [
      { text: "Cancelar" },
      { text: "Remover", style: "destructive", onPress: async () => {
        await saveSkills(skills.filter(s => s.id !== id));
      }}
    ]);
  };

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

  const saveSkill = async () => {
    if (!name.trim()) return Alert.alert("Erro", "Nome obrigatório");
    if (!handlerCode.trim()) return Alert.alert("Erro", "Código obrigatório");

    const iconNames = Object.keys(ICON_MAP);
    const randomIcon = iconNames[Math.floor(Math.random() * iconNames.length)];

    if (editingSkill) {
      const updated = skills.map(s => s.id === editingSkill.id ? { ...s, name: name.trim(), description: description.trim(), handlerCode, parameters: params } : s);
      await saveSkills(updated);
    } else {
      const newSkill: Skill = {
        id: `custom_${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        enabled: true,
        icon: randomIcon,
        parameters: params,
        handlerCode,
      };
      await saveSkills([...skills, newSkill]);
    }
    setIsModalVisible(false);
  };

  const executeSkill = useCallback(async (skill: Skill, args: Record<string, any>): Promise<any> => {
    try {
      const fn = new Function('params', skill.handlerCode);
      return await fn(args);
    } catch (e: any) {
      throw new Error(`Skill "${skill.name}" error: ${e.message}`);
    }
  }, []);

  const getToolsForLLM = useCallback((): any[] => {
    return skills.filter(s => s.enabled).map(s => ({
      type: 'function',
      function: {
        name: s.name,
        description: s.description,
        parameters: {
          type: 'object',
          properties: Object.fromEntries(s.parameters.map(p => [p.name, { type: p.type, description: p.description }])),
          required: s.parameters.filter(p => p.required).map(p => p.name),
        },
      },
    }));
  }, [skills]);

  const getIcon = (iconName: string) => {
    const Icon = ICON_MAP[iconName] || Zap;
    return Icon;
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: textColor }]}>Skills</Text>
            <Text style={[styles.subtitle, { color: secondaryText }]}>Tools / Function Calling</Text>
          </View>
          <TouchableOpacity onPress={openNewSkill} style={styles.addButton}>
            <Plus size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { color: secondaryText }]}>
          {skills.filter(s => s.enabled).length} de {skills.length} ativos — Disponíveis para o LLM como tools
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
                    {skill.parameters.length} param(s) · {skill.handlerCode.split('\n').length} linhas
                  </Text>
                </View>
                <Switch value={skill.enabled} onValueChange={() => toggleSkill(skill.id)} trackColor={{ false: '#333', true: '#007AFF' }} />
              </View>
              <View style={styles.skillActions}>
                <TouchableOpacity onPress={() => openEditSkill(skill)} style={[styles.actionBtn, { borderColor }]}>
                  <Text style={[styles.actionText, { color: '#007AFF' }]}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteSkill(skill.id)} style={[styles.actionBtn, { borderColor }]}>
                  <Text style={[styles.actionText, { color: '#F44336' }]}>Remover</Text>
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
              <Text style={[styles.modalTitle, { color: textColor }]}>{editingSkill ? 'Editar Skill' : 'Nova Skill'}</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}><X size={24} color={textColor} /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: secondaryText }]}>Nome</Text>
              <TextInput style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]} value={name} onChangeText={setName} placeholder="minha_funcao" placeholderTextColor={isDark ? "#444" : "#999"} autoCapitalize="none" />

              <Text style={[styles.label, { color: secondaryText }]}>Descrição</Text>
              <TextInput style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]} value={description} onChangeText={setDescription} placeholder="O que esta skill faz" placeholderTextColor={isDark ? "#444" : "#999"} multiline />

              <Text style={[styles.label, { color: secondaryText }]}>Parâmetros ({params.length})</Text>
              {params.map((p, i) => (
                <View key={i} style={[styles.paramRow, { backgroundColor: inputBg, borderColor }]}>
                  <Text style={[styles.paramText, { color: textColor }]}>{p.name} ({p.type}){p.required ? ' *' : ''}</Text>
                  <TouchableOpacity onPress={() => removeParam(i)}><Trash2 size={16} color="#F44336" /></TouchableOpacity>
                </View>
              ))}

              <View style={[styles.paramAddRow, { borderColor }]}>
                <TextInput style={[styles.paramInput, { backgroundColor: inputBg, color: textColor, borderColor }]} value={paramName} onChangeText={setParamName} placeholder="nome" placeholderTextColor={isDark ? "#444" : "#999"} autoCapitalize="none" />
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
              <Text style={[styles.hint, { color: secondaryText }]}>Obrigatório = toggle azul</Text>

              <Text style={[styles.label, { color: secondaryText }]}>Código (JS)</Text>
              <TextInput style={[styles.codeInput, { backgroundColor: inputBg, color: '#00FF00', borderColor }]} value={handlerCode} onChangeText={setHandlerCode} multiline autoCapitalize="none" placeholder="// params.name, params.age, etc." placeholderTextColor="#333" />

              <TouchableOpacity style={styles.saveButton} onPress={saveSkill}>
                <Text style={styles.saveButtonText}>{editingSkill ? 'Salvar' : 'Criar Skill'}</Text>
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
