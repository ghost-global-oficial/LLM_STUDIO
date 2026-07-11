import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import RNFS from 'react-native-fs';

const SKILLS_FILE = `${RNFS.DocumentDirectoryPath}/skills_config.json`;

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  required: boolean;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  parameters: SkillParameter[];
  handlerCode: string;
  icon: string;
}

interface SkillsContextType {
  skills: Skill[];
  loading: boolean;
  toggleSkill: (id: string) => Promise<void>;
  deleteSkill: (id: string) => Promise<void>;
  saveSkill: (skill: Skill) => Promise<void>;
  updateSkill: (skill: Skill) => Promise<void>;
  executeSkill: (skill: Skill, args: Record<string, any>) => Promise<any>;
  getToolsForLLM: () => any[];
  getSystemPromptWithTools: () => string;
  reloadSkills: () => Promise<void>;
}

const BUILTIN_SKILLS: Omit<Skill, 'id'>[] = [
  {
    name: 'web_search',
    description: 'Search the web using DuckDuckGo',
    enabled: true,
    icon: 'Globe',
    parameters: [
      { name: 'query', type: 'string', description: 'Search query', required: true },
    ],
    handlerCode: `const url = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(params.query) + '&format=json&no_html=1';
const resp = await fetch(url);
const data = await resp.json();
const results = [];
if (data.AbstractText) results.push(data.AbstractText);
if (data.RelatedTopics) {
  data.RelatedTopics.slice(0, 5).forEach(t => {
    if (t.Text) results.push(t.Text);
  });
}
if (results.length === 0 && data.Answer) results.push(data.Answer);
return { query: params.query, results: results.length > 0 ? results.join('\\n\\n') : 'No results found', abstract: data.AbstractText || '', source: data.AbstractURL || '' };`,
  },
  {
    name: 'calculate',
    description: 'Safe calculator for math expressions',
    enabled: true,
    icon: 'Calculator',
    parameters: [
      { name: 'expression', type: 'string', description: 'Math expression (e.g. 2+2*3)', required: true },
    ],
    handlerCode: `const expr = params.expression.replace(/[^0-9+\\-*/().% ]/g, '');
if (!expr) throw new Error('Invalid expression');
const result = eval(expr);
return { expression: params.expression, result: result };`,
  },
  {
    name: 'read_file',
    description: 'Read the content of a local file',
    enabled: true,
    icon: 'FileText',
    parameters: [
      { name: 'path', type: 'string', description: 'File path', required: true },
    ],
    handlerCode: `const filePath = params.path.startsWith('/') ? params.path : RNFS.DocumentDirectoryPath + '/' + params.path;
const exists = await RNFS.exists(filePath);
if (!exists) throw new Error('File not found: ' + params.path);
const content = await RNFS.readFile(filePath, 'utf8');
return { path: params.path, content: content.substring(0, 5000), size: content.length };`,
  },
  {
    name: 'write_file',
    description: 'Write content to a local file',
    enabled: true,
    icon: 'FileText',
    parameters: [
      { name: 'path', type: 'string', description: 'File path', required: true },
      { name: 'content', type: 'string', description: 'Content to write', required: true },
    ],
    handlerCode: `const filePath = params.path.startsWith('/') ? params.path : RNFS.DocumentDirectoryPath + '/' + params.path;
await RNFS.writeFile(filePath, params.content, 'utf8');
return { path: params.path, written: params.content.length + ' bytes' };`,
  },
  {
    name: 'list_files',
    description: 'List files in a directory',
    enabled: true,
    icon: 'FileText',
    parameters: [
      { name: 'path', type: 'string', description: 'Directory path (empty = app root)', required: false },
    ],
    handlerCode: `const dir = params.path ? (params.path.startsWith('/') ? params.path : RNFS.DocumentDirectoryPath + '/' + params.path) : RNFS.DocumentDirectoryPath;
const items = await RNFS.readDir(dir);
const result = items.map(i => ({ name: i.name, isFile: i.isFile(), size: i.size }));
return { directory: dir, items: result };`,
  },
];

const SkillsContext = createContext<SkillsContextType | undefined>(undefined);

export function SkillsProvider({ children }: { children: ReactNode }) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { reloadSkills(); }, []);

  const reloadSkills = async () => {
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
    setLoading(false);
  };

  const persist = async (updated: Skill[]) => {
    setSkills(updated);
    await RNFS.writeFile(SKILLS_FILE, JSON.stringify(updated), 'utf8');
  };

  const toggleSkill = async (id: string) => {
    await persist(skills.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const deleteSkill = async (id: string) => {
    await persist(skills.filter(s => s.id !== id));
  };

  const saveSkill = async (skill: Skill) => {
    await persist([...skills, skill]);
  };

  const updateSkill = async (skill: Skill) => {
    await persist(skills.map(s => s.id === skill.id ? skill : s));
  };

  const executeSkill = useCallback(async (skill: Skill, args: Record<string, any>): Promise<any> => {
    try {
      const fn = new Function('params', 'RNFS', skill.handlerCode);
      return await fn(args, RNFS);
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

  const getSystemPromptWithTools = useCallback((): string => {
    const enabled = skills.filter(s => s.enabled);
    if (enabled.length === 0) return '';

    const toolDefs = enabled.map(s => {
      const params = s.parameters.map(p =>
        `  - ${p.name} (${p.type}${p.required ? ', required' : ''}): ${p.description}`
      ).join('\n');
      return `• ${s.name}: ${s.description}\n${params}`;
    }).join('\n\n');

    return `You have access to these tools. To use a tool, output EXACTLY this format on its own line:
[TOOL_CALL: tool_name(param1="value1", param2="value2")]

After receiving a tool result, continue your response using the information.

Available tools:
${toolDefs}`;
  }, [skills]);

  return (
    <SkillsContext.Provider value={{
      skills, loading, toggleSkill, deleteSkill, saveSkill, updateSkill,
      executeSkill, getToolsForLLM, getSystemPromptWithTools, reloadSkills,
    }}>
      {children}
    </SkillsContext.Provider>
  );
}

export function useSkills(): SkillsContextType {
  const context = useContext(SkillsContext);
  if (!context) throw new Error('useSkills must be used within a SkillsProvider');
  return context;
}
