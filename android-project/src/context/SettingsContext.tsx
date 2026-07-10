import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { NativeModules, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import translations from '../data/translations';

type Language = 'pt' | 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ko' | 'ru' | 'ar';

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  welcomeSeen: boolean;
  setWelcomeSeen: (seen: boolean) => void;
  performanceMode: string;
  setPerformanceMode: (mode: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);
const SETTINGS_FILE = `${RNFS.DocumentDirectoryPath}/settings.json`;

const LANGUAGES: Record<Language, string> = {
  pt: 'Portugues',
  en: 'English',
  es: 'Espanol',
  fr: 'Francais',
  de: 'Alemao',
  zh: 'Chines',
  ja: 'Japones',
  ko: 'Coreano',
  ru: 'Russo',
  ar: 'Arabe',
};

export { LANGUAGES };
export type { Language };

const DEFAULT_SYSTEM_PROMPT = 'You are a helpful, harmless, and honest AI assistant.';

function getDeviceLanguage(): Language {
  try {
    let locale = '';
    if (Platform.OS === 'ios') {
      locale = NativeModules.SettingsManager?.settings?.AppleLocale || '';
    } else {
      locale = NativeModules.I18nManager?.localeIdentifier || '';
    }
    const langCode = locale.split(/[_-]/)[0]?.toLowerCase() || '';
    if (langCode && LANGUAGES[langCode as Language]) {
      return langCode as Language;
    }
  } catch {}
  return 'en';
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getDeviceLanguage());
  const [systemPrompt, setSystemPromptState] = useState(DEFAULT_SYSTEM_PROMPT);
  const [welcomeSeen, setWelcomeSeenState] = useState(false);
  const [performanceMode, setPerformanceModeState] = useState('balanced');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const exists = await RNFS.exists(SETTINGS_FILE);
        if (exists) {
          const data = await RNFS.readFile(SETTINGS_FILE, 'utf8');
          const settings = JSON.parse(data);
          if (settings.language && LANGUAGES[settings.language as Language]) {
            setLanguageState(settings.language as Language);
          }
          if (settings.systemPrompt) {
            setSystemPromptState(settings.systemPrompt);
          }
          if (settings.welcomeSeen) {
            setWelcomeSeenState(true);
          }
          if (settings.performanceMode) {
            setPerformanceModeState(settings.performanceMode);
          }
        }
      } catch (e) {
        console.log('Error loading settings', e);
      }
      setLoaded(true);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (loaded) {
      RNFS.writeFile(SETTINGS_FILE, JSON.stringify({ language, systemPrompt, welcomeSeen, performanceMode }), 'utf8').catch(e =>
        console.log('Error saving settings', e)
      );
    }
  }, [language, systemPrompt, welcomeSeen, performanceMode, loaded]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const setSystemPrompt = (prompt: string) => {
    setSystemPromptState(prompt);
  };

  const setWelcomeSeen = (seen: boolean) => {
    setWelcomeSeenState(seen);
  };

  const setPerformanceMode = (mode: string) => {
    setPerformanceModeState(mode);
  };

  return (
    <SettingsContext.Provider value={{ language, setLanguage, systemPrompt, setSystemPrompt, welcomeSeen, setWelcomeSeen, performanceMode, setPerformanceMode }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export function useTranslation() {
  const { language } = useSettings();
  return useMemo(() => {
    const t = (key: string): string => {
      return translations[language]?.[key] || translations['en']?.[key] || key;
    };
    return { t, language };
  }, [language]);
}
