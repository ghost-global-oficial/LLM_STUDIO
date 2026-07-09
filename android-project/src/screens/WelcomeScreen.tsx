import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Animated, Image } from 'react-native';
import { Cpu, Server, Zap, ChevronRight, X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useSettings, useTranslation } from '../context/SettingsContext';

const { width } = Dimensions.get('window');

interface WelcomeScreenProps {
  navigation: any;
}

const FEATURES = [
  { key: 'welcomeFeature1', icon: Cpu, color: '#FF9500' },
  { key: 'welcomeFeature2', icon: Server, color: '#34C759' },
  { key: 'welcomeFeature3', icon: Zap, color: '#007AFF' },
];

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const { isDark } = useTheme();
  const { setWelcomeSeen } = useSettings();
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<any>(null);

  const bgColor = isDark ? '#0F0F0F' : '#F5F5F5';
  const textColor = isDark ? '#FFF' : '#000';
  const secondaryText = isDark ? '#888' : '#666';
  const cardBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const cardBorder = isDark ? '#2A2A2A' : '#E0E0E0';

  const handleNext = () => {
    if (currentPage < FEATURES.length) {
      flatListRef.current?.scrollToIndex({ index: currentPage + 1, animated: true });
    } else {
      setWelcomeSeen(true);
    }
  };

  const handleSkip = () => {
    setWelcomeSeen(true);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if (index === 0) {
      return (
        <View style={[styles.page, { width }]}>
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/icon.png')} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Text style={[styles.welcomeTitle, { color: textColor }]}>{t('welcomeTitle')}</Text>
          <Text style={[styles.welcomeDesc, { color: secondaryText }]}>{t('welcomeDesc')}</Text>
        </View>
      );
    }

    const feature = FEATURES[index - 1];
    const Icon = feature.icon;

    return (
      <View style={[styles.page, { width }]}>
        <View style={[styles.featureCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={[styles.featureIconContainer, { backgroundColor: feature.color + '15' }]}>
            <Icon size={48} color={feature.color} />
          </View>
          <Text style={[styles.featureTitle, { color: textColor }]}>{t(feature.key + 'Title')}</Text>
          <Text style={[styles.featureDesc, { color: secondaryText }]}>{t(feature.key + 'Desc')}</Text>
        </View>
      </View>
    );
  };

  const totalPages = FEATURES.length + 1;
  const isLastPage = currentPage === FEATURES.length;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={[styles.skipText, { color: secondaryText }]}>{isLastPage ? '' : 'Skip'}</Text>
      </TouchableOpacity>

      <Animated.FlatList
        ref={flatListRef}
        data={[{}, ...FEATURES]}
        renderItem={renderItem}
        keyExtractor={(_, i) => i.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentPage(index);
        }}
        scrollEnabled={false}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {Array.from({ length: totalPages }).map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: isDark ? '#FFF' : '#000',
                  },
                ]}
              />
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: isDark ? '#FFF' : '#000' }]}
          onPress={handleNext}
        >
          {isLastPage ? (
            <X size={24} color={isDark ? '#000' : '#FFF'} />
          ) : (
            <ChevronRight size={24} color={isDark ? '#000' : '#FFF'} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipButton: { position: 'absolute', top: 60, right: 20, zIndex: 10, padding: 10 },
  skipText: { fontSize: 16, fontWeight: '500' },
  page: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  logoContainer: { marginBottom: 40 },
  logoImage: { width: 140, height: 140 },
  welcomeTitle: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  welcomeDesc: { fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 10 },
  featureCard: { width: '100%', borderRadius: 24, padding: 40, alignItems: 'center', borderWidth: 1 },
  featureIconContainer: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  featureTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  featureDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  footer: { paddingHorizontal: 30, paddingBottom: 60, alignItems: 'center' },
  pagination: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, gap: 8 },
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
  nextButton: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  nextButtonText: { fontSize: 16, fontWeight: '600' },
});
