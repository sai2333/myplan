import React, { useEffect } from 'react';
import { LogBox, Platform, ToastAndroid } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { AppNavigator } from './src/navigation';
import { theme, darkTheme, marioTheme, splatoonTheme } from './src/theme';
import { useSettingsStore } from './src/store/useSettingsStore';
import { registerForPushNotificationsAsync, ensureChannelExists } from './src/services/notification';
import * as DB from './src/db';
import { updateAllWidgets } from './src/services/widget';
import { initAudioMode } from './src/utils/sound';

import { MarioBackground } from './src/components/MarioBackground';
import { SplatoonBackground } from './src/components/SplatoonBackground';

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
    const content = notification.request.content;
    const data = content.data || {};
    
    // Debug logging for trigger structure
    // console.log('[Notification] Trigger received:', JSON.stringify(trigger));
    
    // 0. New "Just Created" Check (for Habit immediate firing bug)
    // If a notification fires within 15 seconds of its creation, and it's a repeating habit trigger,
    // it's likely an OS bug or "catch up" that we want to ignore.
    if (data.createdAt) {
        const now = Date.now();
        const createdDiff = now - data.createdAt;
        console.log(`[Notification] Created Diff: ${createdDiff}ms`);
        
        if (createdDiff < 15000 && data.type === 'habit') {
            console.log('[Notification] Suppressed immediate firing of newly created habit notification.');
            return {
                shouldShowAlert: false,
                shouldPlaySound: false,
                shouldSetBadge: false,
            };
        }
    }

    // 1. Handle TimestampTrigger (Todo) - Check for past/expired notifications
    if (trigger && 'value' in trigger && typeof trigger.value === 'number') {
         const scheduledTime = trigger.value;
         const now = Date.now();
         const diff = now - scheduledTime;
         console.log(`[Notification] Scheduled: ${new Date(scheduledTime).toLocaleTimeString()}, Now: ${new Date(now).toLocaleTimeString()}, Diff: ${diff}ms`);
         
         // If the scheduled time was more than 5 minutes ago
         if (diff > 5 * 60 * 1000) {
             console.log('[Notification] Suppressed because it is too old.');
             if (Platform.OS === 'android') {
                 const title = notification.request.content.title || '未知任务';
                 ToastAndroid.show(`已忽略过期的提醒: ${title}`, ToastAndroid.LONG);
             }
             return {
                 shouldShowAlert: false,
                 shouldPlaySound: false,
                 shouldSetBadge: false,
             };
         }
     }
     
     // 2. Handle CalendarTrigger (Habit) - Check for premature firing
     // Expo CalendarTrigger structure usually has { type: 'calendar', dateComponents: { hour, minute, ... } }
     // or direct properties depending on platform implementation details.
     // We look for hour/minute properties.
     if (trigger && (trigger.type === 'calendar' || ('hour' in trigger && 'minute' in trigger))) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // Extract trigger time
        let triggerHour: number | undefined;
        let triggerMinute: number | undefined;
        
        if ('dateComponents' in trigger && trigger.dateComponents) {
            triggerHour = (trigger.dateComponents as any).hour;
            triggerMinute = (trigger.dateComponents as any).minute;
        } else if ('hour' in trigger) {
             triggerHour = (trigger as any).hour;
             triggerMinute = (trigger as any).minute;
        }

        if (triggerHour !== undefined && triggerMinute !== undefined) {
             console.log(`[Notification] Calendar Trigger: ${triggerHour}:${triggerMinute}, Now: ${currentHour}:${currentMinute}`);
             
             // Calculate difference in minutes
             // We need to handle day wrap around (e.g. 23:59 -> 00:01)
             // But simpler: if the time matches EXACTLY (or within 1 min), show it.
             // If it is vastly different, suppress it.
             // Why? Because if I set 10:02 and now is 10:00, diff is 2 min.
             // If I set 10:02 and now is 10:02, diff is 0.
             
             const nowTotal = currentHour * 60 + currentMinute;
             const triggerTotal = triggerHour * 60 + triggerMinute;
             
             let diffMinutes = nowTotal - triggerTotal;
             
             // Handle midnight wrap-around logic roughly (if needed, but usually user is awake)
             // If diff is huge (e.g. -1400), maybe wrap around?
             // But for the "premature firing" bug:
             // User sets 10:02, Now is 10:00.
             // triggerTotal = 602, nowTotal = 600.
             // diffMinutes = -2.
             
             // So if diffMinutes is NEGATIVE (and not just -1 for slight sync issues), it means FUTURE.
             // We should SUPPRESS future notifications that fire now.
             
             if (diffMinutes < -1) {
                 console.log('[Notification] Suppressed premature notification (Future).');
                 return {
                     shouldShowAlert: false,
                     shouldPlaySound: false,
                     shouldSetBadge: false,
                 };
             }
             
             // If diffMinutes is very large POSITIVE, it might be an old notification?
             // But for daily repeating, it might just be "today's" instance.
             // If I set 9:00, and now is 10:00. It shouldn't fire now.
             // If it fires now, it's late.
             // Let's suppress if > 5 mins late too, similar to TimestampTrigger.
             if (diffMinutes > 5) {
                 console.log('[Notification] Suppressed late notification.');
                 return {
                     shouldShowAlert: false,
                     shouldPlaySound: false,
                     shouldSetBadge: false,
                 };
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
  const themeMode = useSettingsStore((state) => state.themeMode);

  const currentTheme = React.useMemo(() => {
    if (themeMode === 'dark') return darkTheme;
    if (themeMode === 'mario') return marioTheme;
    if (themeMode === 'splatoon') return splatoonTheme;
    return theme;
  }, [themeMode]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const widgetTheme = themeMode === 'dark' ? 'dark' : 'light';
      DB.setWidgetTheme(widgetTheme).then(() => {
        updateAllWidgets();
      });
    }
  }, [themeMode]);

  useEffect(() => {
    initAudioMode();

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
      <PaperProvider theme={currentTheme}>
        {themeMode === 'mario' ? (
          <MarioBackground>
            <AppNavigator />
          </MarioBackground>
        ) : themeMode === 'splatoon' ? (
          <SplatoonBackground>
            <AppNavigator />
          </SplatoonBackground>
        ) : (
          <AppNavigator />
        )}
        <StatusBar style={themeMode === 'dark' || themeMode === 'splatoon' ? 'light' : 'dark'} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
