import React, { useEffect } from 'react';
import { LogBox, Platform, ToastAndroid } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { AppNavigator } from './src/navigation';
import { theme, darkTheme } from './src/theme';
import { useSettingsStore } from './src/store/useSettingsStore';
import { registerForPushNotificationsAsync, ensureChannelExists } from './src/services/notification';

// Suppress the error about Push Notifications in Expo Go (we only use Local Notifications)
LogBox.ignoreLogs([
  /expo-notifications: Android Push notifications \(remote notifications\) functionality provided by expo-notifications was removed/,
]);

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Check if notification is too old (e.g., delayed by system > 5 minutes)
    // notification.date is the time it was delivered/received.
    // However, for local notifications, we care about when it WAS SUPPOSED to fire.
    // notification.request.trigger might have the info.
    // But simpler: if it's popping up NOW, it means it just arrived.
    // If the user says "it passed time", it means the INTENDED time was long ago.
    // For scheduled notifications, the trigger usually contains the value.
    
    const trigger = notification.request.trigger;
     if (trigger && 'value' in trigger && typeof trigger.value === 'number') {
         const scheduledTime = trigger.value;
         const now = Date.now();
         const diff = now - scheduledTime;
         console.log(`[Notification] Scheduled: ${new Date(scheduledTime).toLocaleTimeString()}, Now: ${new Date(now).toLocaleTimeString()}, Diff: ${diff}ms`);
         
         // If the scheduled time was more than 5 minutes ago (Increased from 2 to 5 to avoid accidental misses)
         if (diff > 5 * 60 * 1000) {
             console.log('[Notification] Suppressed because it is too old.');
             if (Platform.OS === 'android') {
                 const title = notification.request.content.title || '未知任务';
                 ToastAndroid.show(`已忽略过期的提醒: ${title} (延迟${Math.round(diff/1000/60)}分钟)`, ToastAndroid.LONG);
             }
             // Suppress it
             return {
                 shouldShowAlert: false,
                 shouldPlaySound: false,
                 shouldSetBadge: false,
             };
         }
         
         // If delayed by more than 1 minute but less than 5 minutes, warn user about background restrictions
         if (diff > 1 * 60 * 1000) {
             if (Platform.OS === 'android') {
                 ToastAndroid.show(`检测到通知延迟(${Math.round(diff/1000/60)}分钟)，请检查后台运行权限`, ToastAndroid.LONG);
             }
         }
     }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

export default function App() {
  const isDarkTheme = useSettingsStore((state) => state.isDarkTheme);

  useEffect(() => {
    const initNotifications = async () => {
      try {
        // Always ensure channel exists (safe and needed for local notifications on Android)
        await ensureChannelExists();

        // Check for Expo Go environment
        // Constants.appOwnership is deprecated/unreliable in newer SDKs for this check
        const isExpoGo = Constants.executionEnvironment === 'storeClient';

        if (!isExpoGo) {
          await registerForPushNotificationsAsync();
        } else {
          // In Expo Go, we still need permissions for local notifications.
          // We try to request them, but catch any error related to remote notifications removal.
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
             await Notifications.requestPermissionsAsync();
          }
        }
      } catch (error) {
        console.log('Notification initialization error:', error);
      }
    };

    initNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={isDarkTheme ? darkTheme : theme}>
        <AppNavigator />
        <StatusBar style={isDarkTheme ? 'light' : 'dark'} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
