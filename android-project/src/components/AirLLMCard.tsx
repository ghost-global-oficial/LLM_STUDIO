import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Zap, X, Wifi, WifiOff, Check } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/SettingsContext';
import { ModelType } from '../data/modelsData';

interface AirLLMCardProps {
  visible: boolean;
  modelType: ModelType;
  modelName: string;
  onActivate: () => void;
  onDecline: () => void;
}

const MODEL_TYPE_LABELS: Record<ModelType, { icon: string; color: string }> = {
  image: { icon: '🖼️', color: '#FF6B6B' },
  video: { icon: '🎬', color: '#4ECDC4' },
  '3d': { icon: '🧊', color: '#45B7D1' },
  text: { icon: '💬', color: '#96CEB4' },
};

export default function AirLLMCard({ visible, modelType, modelName, onActivate, onDecline }: AirLLMCardProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [checking, setChecking] = useState(false);
  const [airllmStatus, setAirllmStatus] = useState<'unknown' | 'available' | 'unavailable'>('unknown');

  const typeInfo = MODEL_TYPE_LABELS[modelType] || MODEL_TYPE_LABELS.text;
  const isImage = modelType === 'image';
  const isVideo = modelType === 'video';
  const is3D = modelType === '3d';

  const bgColor = isDark ? '#1E1E1E' : '#FFFFFF';
  const textColor = isDark ? '#FFF' : '#000';
  const secondaryText = isDark ? '#888' : '#666';
  const borderColor = isDark ? '#2A2A2A' : '#E0E0E0';

  const checkAirLLMStatus = async () => {
    setChecking(true);
    try {
      const response = await fetch('http://127.0.0.1:11436/api/tags', {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      setAirllmStatus(response.ok ? 'available' : 'unavailable');
    } catch {
      setAirllmStatus('unavailable');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (visible) {
      checkAirLLMStatus();
    }
  }, [visible]);

  const handleActivate = () => {
    onActivate();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: bgColor, borderColor }]}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: typeInfo.color + '20' }]}>
              <Zap size={28} color={typeInfo.color} />
            </View>
            <TouchableOpacity onPress={onDecline} style={styles.closeButton}>
              <X size={20} color={secondaryText} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: textColor }]}>
            {t('airllmTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: secondaryText }]}>
            {isImage && t('airllmImageDesc')}
            {isVideo && t('airllmVideoDesc')}
            {is3D && t('airllm3dDesc')}
          </Text>

          <View style={[styles.modelInfo, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
            <Text style={[styles.modelType, { color: typeInfo.color }]}>
              {typeInfo.icon} {modelName}
            </Text>
          </View>

          <View style={styles.statusRow}>
            {checking ? (
              <ActivityIndicator size="small" color={typeInfo.color} />
            ) : airllmStatus === 'available' ? (
              <View style={styles.statusBadge}>
                <Wifi size={16} color="#4CAF50" />
                <Text style={[styles.statusText, { color: '#4CAF50' }]}>{t('airllmAvailable')}</Text>
              </View>
            ) : (
              <View style={styles.statusBadge}>
                <WifiOff size={16} color="#FF9800" />
                <Text style={[styles.statusText, { color: '#FF9800' }]}>{t('airllmUnavailable')}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.description, { color: secondaryText }]}>
            {airllmStatus === 'available'
              ? t('airllmWillUse')
              : t('airllmNeedStart')
            }
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.declineButton, { borderColor }]}
              onPress={onDecline}
            >
              <Text style={[styles.declineText, { color: secondaryText }]}>{t('airllmUseLocal')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.activateButton, { backgroundColor: typeInfo.color }]}
              onPress={handleActivate}
              disabled={checking}
            >
              <Zap size={18} color="#FFF" />
              <Text style={styles.activateText}>{t('airllmActivate')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  modelInfo: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  modelType: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activateButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  activateText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
