import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import RNFS from 'react-native-fs';

const { DownloadModule } = NativeModules;
const downloadEmitter = new NativeEventEmitter(DownloadModule);

interface DownloadItem {
  name: string;
  url: string;
  path: string;
  progress: number;
  status: 'downloading' | 'completed' | 'error' | 'cancelled';
  error?: string;
}

interface DownloadContextType {
  activeDownload: DownloadItem | null;
  startDownload: (name: string, url: string, path: string) => Promise<void>;
  cancelDownload: () => void;
  isDownloading: boolean;
}

const DownloadContext = createContext<DownloadContextType>({
  activeDownload: null,
  startDownload: async () => {},
  cancelDownload: () => {},
  isDownloading: false,
});

export const useDownload = () => useContext(DownloadContext);

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const [activeDownload, setActiveDownload] = useState<DownloadItem | null>(null);
  const downloadInfoRef = useRef<{ name: string; url: string; path: string } | null>(null);

  useEffect(() => {
    const progressSub = downloadEmitter.addListener('onDownloadProgress', (event) => {
      const pct = event.progress / 100;
      setActiveDownload(prev => prev ? { ...prev, progress: pct } : null);
    });

    const completeSub = downloadEmitter.addListener('onDownloadComplete', () => {
      setActiveDownload(prev => prev ? { ...prev, progress: 1, status: 'completed' } : null);
      downloadInfoRef.current = null;
      setTimeout(() => setActiveDownload(null), 2000);
    });

    const errorSub = downloadEmitter.addListener('onDownloadError', (event) => {
      setActiveDownload(prev => prev ? { ...prev, status: 'error', error: event.error } : null);
      downloadInfoRef.current = null;
      setTimeout(() => setActiveDownload(null), 2000);
    });

    return () => {
      progressSub.remove();
      completeSub.remove();
      errorSub.remove();
    };
  }, []);

  const cancelDownload = useCallback(() => {
    DownloadModule?.cancelDownload();
    setActiveDownload(prev => prev ? { ...prev, status: 'cancelled' } : null);
    downloadInfoRef.current = null;
    setTimeout(() => setActiveDownload(null), 500);
  }, []);

  const startDownload = useCallback(async (name: string, url: string, path: string) => {
    if (downloadInfoRef.current) return;

    // Ensure directory exists
    const dirPath = path.substring(0, path.lastIndexOf('/'));
    try {
      const dirExists = await RNFS.exists(dirPath);
      if (!dirExists) await RNFS.mkdir(dirPath);
    } catch {}

    downloadInfoRef.current = { name, url, path };
    setActiveDownload({ name, url, path, progress: 0, status: 'downloading' });

    // Start native foreground service (continues in background)
    DownloadModule?.startDownload(url, path, name);
  }, []);

  return (
    <DownloadContext.Provider value={{ activeDownload, startDownload, cancelDownload, isDownloading: !!downloadInfoRef.current }}>
      {children}
    </DownloadContext.Provider>
  );
}
