import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as Keychain from 'react-native-keychain';
import CryptoJS from 'crypto-js';

const KEYCHAIN_SERVICE = 'com.ghostsystems.talosllmstudio.encryption';
const KEYCHAIN_KEY = 'chat_encryption_key';

interface EncryptionContextType {
  encrypt: (text: string) => string;
  decrypt: (encrypted: string) => string;
  ready: boolean;
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(undefined);

function generateKey(): string {
  return CryptoJS.lib.WordArray.random(32).toString();
}

export function EncryptionProvider({ children }: { children: ReactNode }) {
  const [secretKey, setSecretKey] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const existing = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
        if (existing) {
          setSecretKey(existing.password);
        } else {
          const newKey = generateKey();
          await Keychain.setGenericPassword(KEYCHAIN_KEY, newKey, {
            service: KEYCHAIN_SERVICE,
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          });
          setSecretKey(newKey);
        }
      } catch {
        const fallback = generateKey();
        setSecretKey(fallback);
      }
      setReady(true);
    };
    init();
  }, []);

  const encrypt = useCallback((text: string): string => {
    if (!secretKey) return text;
    return CryptoJS.AES.encrypt(text, secretKey).toString();
  }, [secretKey]);

  const decrypt = useCallback((encrypted: string): string => {
    if (!secretKey) return encrypted;
    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted || encrypted;
    } catch {
      return encrypted;
    }
  }, [secretKey]);

  return (
    <EncryptionContext.Provider value={{ encrypt, decrypt, ready }}>
      {children}
    </EncryptionContext.Provider>
  );
}

export function useEncryption(): EncryptionContextType {
  const context = useContext(EncryptionContext);
  if (!context) throw new Error('useEncryption must be used within EncryptionProvider');
  return context;
}
