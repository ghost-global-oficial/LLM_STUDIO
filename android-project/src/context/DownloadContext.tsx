import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import RNFS from 'react-native-fs';

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
  const jobRef = useRef<any>(null);
  const isDownloadingRef = useRef(false);

  const cancelDownload = useCallback(() => {
    if (jobRef.current) {
      jobRef.current.stop();
      jobRef.current = null;
    }
    isDownloadingRef.current = false;
    setActiveDownload(prev => prev ? { ...prev, status: 'cancelled' } : null);
    setTimeout(() => setActiveDownload(null), 500);
  }, []);

  const startDownload = useCallback(async (name: string, url: string, path: string) => {
    if (isDownloadingRef.current) return;

    const dirPath = path.substring(0, path.lastIndexOf('/'));
    const tmpPath = path + '.downloading.tmp';
    try {
      const dirExists = await RNFS.exists(dirPath);
      if (!dirExists) await RNFS.mkdir(dirPath);
      const tmpExists = await RNFS.exists(tmpPath);
      if (tmpExists) await RNFS.unlink(tmpPath);
    } catch {}

    isDownloadingRef.current = true;
    setActiveDownload({ name, url, path, progress: 0, status: 'downloading' });

    try {
      const downloadJob = RNFS.downloadFile({
        fromUrl: url,
        toFile: tmpPath,
        progressDivider: 1,
        progress: (res: any) => {
          if (res.contentLength > 0) {
            const pct = res.bytesWritten / res.contentLength;
            setActiveDownload(prev => prev ? { ...prev, progress: pct } : null);
          }
        },
      });

      jobRef.current = downloadJob;
      const result = await downloadJob.promise;

      if (result.statusCode === 200) {
        const tmpExists = await RNFS.exists(tmpPath);
        if (tmpExists) {
          const tmpStat = await RNFS.stat(tmpPath);
          if (tmpStat.size > 1024) {
            await RNFS.moveFile(tmpPath, path);
          } else {
            await RNFS.unlink(tmpPath);
            throw new Error('Downloaded file too small - likely incomplete');
          }
        }
        setActiveDownload(prev => prev ? { ...prev, progress: 1, status: 'completed' } : null);
      } else {
        try { await RNFS.unlink(tmpPath); } catch {}
        setActiveDownload(prev => prev ? { ...prev, status: 'error', error: `HTTP ${result.statusCode}` } : null);
      }
    } catch (e: any) {
      try { await RNFS.unlink(tmpPath); } catch {}
      setActiveDownload(prev => prev ? { ...prev, status: 'error', error: e.message } : null);
    } finally {
      jobRef.current = null;
      isDownloadingRef.current = false;
      setTimeout(() => setActiveDownload(null), 2000);
    }
  }, []);

  return (
    <DownloadContext.Provider value={{ activeDownload, startDownload, cancelDownload, isDownloading: isDownloadingRef.current }}>
      {children}
    </DownloadContext.Provider>
  );
}
