import React from 'react';
import { StyleSheet, View, StatusBar, Platform } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FolderOpen, MessageCircle, Server, Zap, FileText, Settings } from 'lucide-react-native';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { DownloadProvider } from './src/context/DownloadContext';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { SkillsProvider } from './src/context/SkillsContext';
import { EncryptionProvider } from './src/context/EncryptionContext';
import ModelsScreen from './src/screens/ModelsScreen';
import ChatScreen from './src/screens/ChatScreen';
import ServerScreen from './src/screens/ServerScreen';
import SkillsScreen from './src/screens/SkillsScreen';
import DocsScreen from './src/screens/DocsScreen';
import DocDetailScreen from './src/screens/DocDetailScreen';
import ChatHistoryScreen from './src/screens/ChatHistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DownloadScreen from './src/screens/DownloadScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';

export type RootStackParamList = {
  Welcome: undefined;
  MainTabs: undefined;
  Chat: { fileUri: string; fileName: string; loadHistory?: any };
  Download: undefined;
  Settings: undefined;
  DocDetail: { title: string; sections: { title: string; content: string; tips?: string[] }[] };
  ChatHistory: undefined;
};

export type MainTabParamList = {
  Models: undefined;
  ChatTab: undefined;
  Server: undefined;
  Skills: undefined;
  Docs: undefined;
  SettingsTab: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0F0F0F',
    card: '#1E1E1E',
    text: '#FFF',
    border: '#2A2A2A',
    primary: '#FFF',
  },
};

const MyLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#F5F5F5',
    card: '#FFFFFF',
    text: '#000000',
    border: '#E0E0E0',
    primary: '#000000',
  },
};

function MainTabs() {
  const { isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let IconComponent;
          if (route.name === 'Models') IconComponent = <FolderOpen size={24} color={color} strokeWidth={focused ? 2.5 : 2} />;
          else if (route.name === 'ChatTab') IconComponent = <MessageCircle size={24} color={color} strokeWidth={focused ? 2.5 : 2} />;
          else if (route.name === 'Server') IconComponent = <Server size={24} color={color} strokeWidth={focused ? 2.5 : 2} />;
          else if (route.name === 'Skills') IconComponent = <Zap size={24} color={color} strokeWidth={focused ? 2.5 : 2} />;
          else if (route.name === 'Docs') IconComponent = <FileText size={24} color={color} strokeWidth={focused ? 2.5 : 2} />;
          else if (route.name === 'SettingsTab') IconComponent = <Settings size={24} color={color} strokeWidth={focused ? 2.5 : 2} />;
          else IconComponent = <MessageCircle size={24} color={color} />;

          return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 18 }}>
              {IconComponent}
            </View>
          );
        },
        tabBarShowLabel: false,
        tabBarLabel: () => null,
        safeAreaInsets: { bottom: 0, top: 0, left: 0, right: 0 },
        tabBarActiveTintColor: isDark ? '#FFF' : '#000',
        tabBarInactiveTintColor: isDark ? '#666' : '#999',
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: isDark ? '#121212' : '#FFFFFF',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTopWidth: 0,
          height: 70,
          elevation: 8,
          shadowColor: isDark ? '#000' : '#888',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          paddingBottom: 0,
          paddingTop: 0,
          borderWidth: 1,
          borderColor: isDark ? '#2A2A2A' : '#E0E0E0',
          borderBottomWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarItemStyle: {
          height: 65,
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: 0,
          paddingBottom: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
      })}
    >
      <Tab.Screen name="Models" component={ModelsScreen} />
      <Tab.Screen
        name="ChatTab"
        component={View}
        options={{ tabBarLabel: 'Chat' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            (navigation as any).navigate('Chat', { fileUri: '', fileName: 'Sem Modelo' });
          },
        })}
      />
      <Tab.Screen name="Server" component={ServerScreen} />
      <Tab.Screen name="Skills" component={SkillsScreen} />
      <Tab.Screen name="Docs" component={DocsScreen} />
      <Tab.Screen
        name="SettingsTab"
        component={View}
        options={{ tabBarLabel: 'Settings' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            (navigation as any).navigate('Settings');
          },
        })}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isDark } = useTheme();
  const { welcomeSeen } = useSettings();

  return (
    <NavigationContainer theme={isDark ? MyDarkTheme : MyLightTheme}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0F0F0F' : '#F5F5F5'} />
      <Stack.Navigator
        initialRouteName={welcomeSeen ? 'MainTabs' : 'Welcome'}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: isDark ? '#0F0F0F' : '#F5F5F5' } }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Download" component={DownloadScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="DocDetail" component={DocDetailScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ChatHistory" component={ChatHistoryScreen} options={{ animation: 'slide_from_right' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <EncryptionProvider>
          <SkillsProvider>
            <DownloadProvider>
              <AppNavigator />
            </DownloadProvider>
          </SkillsProvider>
        </EncryptionProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({});
